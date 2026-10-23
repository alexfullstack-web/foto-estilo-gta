import { Router } from 'express';
import crypto from 'node:crypto';
import { config, getFullStatus } from '../config.js';
import { AppError } from '../utils/AppError.js';
import { detectImageType } from '../utils/imageType.js';
import { uploadPhoto } from '../middleware/upload.js';
import { reserveGeneration, getQuota } from '../middleware/quota.js';
import { transformPhoto } from '../services/imageProvider.js';
import { buildPrompt, publicOptions, SCENARIOS, STYLES, FORMATS, DEFAULTS } from '../services/promptBuilder.js';
import * as storage from '../services/storage.js';
import { saveGenerated } from '../services/resultStore.js';

export const api = Router();

/** Identificador anônimo do navegador (gerado no frontend) para montar a galeria. */
function clientIdFrom(req) {
  const id = req.get('X-Client-Id');
  return storage.isValidId(id) ? id : null;
}

const hashIp = (ip) => crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 32);

// ── Status / configuração ────────────────────────────────────
api.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    ai: (({ configured, name, model, missing, problem }) => ({ configured, provider: name, model, missing, problem }))(
      getFullStatus()
    ),
    limits: {
      maxUploadMb: config.limits.effectiveUploadMb,
      dailyPerIp: config.limits.dailyPerIp,
      retentionHours: config.storage.retentionHours,
      acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    options: publicOptions(),
  });
});

api.get('/quota', (req, res) => {
  res.json(getQuota(req.ip));
});

// ── Geração ──────────────────────────────────────────────────
function requireProvider(_req, _res, next) {
  const status = getFullStatus();
  if (!status.configured) {
    return next(new AppError(503, 'AI_NOT_CONFIGURED', `A API de IA não está configurada no servidor. ${status.problem}`));
  }
  next();
}

api.post('/generate', requireProvider, reserveGeneration, uploadPhoto, async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'NO_FILE', 'Nenhuma foto enviada. Selecione uma imagem JPG, PNG ou WEBP.');
    }

    const type = detectImageType(req.file.buffer);
    if (!type) {
      throw new AppError(415, 'INVALID_FILE_CONTENT', 'O arquivo não é uma imagem JPG, PNG ou WEBP válida.');
    }

    const scenario = SCENARIOS[req.body.scenario] ? req.body.scenario : DEFAULTS.scenario;
    const style = STYLES[req.body.style] ? req.body.style : DEFAULTS.style;
    const format = FORMATS[req.body.format] ? req.body.format : DEFAULTS.format;

    const started = Date.now();
    const result = await transformPhoto({
      buffer: req.file.buffer,
      mime: type.mime,
      ext: type.ext,
      prompt: buildPrompt({ scenario, style }),
      format,
      safetyId: hashIp(req.ip),
    });

    // Descarta a foto original da memória
    req.file.buffer = null;

    const id = crypto.randomUUID();
    const meta = {
      clientId: clientIdFrom(req),
      scenario,
      style,
      format,
      model: result.model,
      createdAt: new Date().toISOString(),
    };
    const image = await saveGenerated(id, result.buffer, meta);

    req.quota.commit();
    console.log(`[IA] Imagem ${id} gerada em ${((Date.now() - started) / 1000).toFixed(1)}s`);

    res.status(201).json({ image, quota: getQuota(req.ip) });
  } catch (err) {
    next(err);
  }
});

// ── Galeria e arquivos ───────────────────────────────────────
api.get('/gallery', async (req, res, next) => {
  try {
    const items = await storage.listByClient(clientIdFrom(req));
    res.json({ images: items.map(storage.toPublic), retentionHours: config.storage.retentionHours });
  } catch (err) {
    next(err);
  }
});

api.get('/images/:id', async (req, res, next) => {
  try {
    const meta = await storage.getMeta(req.params.id);
    if (!meta) throw new AppError(404, 'IMAGE_NOT_FOUND', 'Imagem não encontrada ou expirada.');

    const file = storage.getImagePath(meta.id);
    res.set('Cache-Control', 'private, max-age=3600');
    if (req.query.download) {
      return res.download(file, `personagem-${meta.id.slice(0, 8)}.png`);
    }
    res.type('png').sendFile(file);
  } catch (err) {
    next(err);
  }
});

api.delete('/images/:id', async (req, res, next) => {
  try {
    const meta = await storage.getMeta(req.params.id);
    if (!meta) throw new AppError(404, 'IMAGE_NOT_FOUND', 'Imagem não encontrada ou expirada.');
    if (!meta.clientId || meta.clientId !== clientIdFrom(req)) {
      throw new AppError(403, 'FORBIDDEN', 'Você só pode apagar imagens geradas por você.');
    }
    await storage.removeResult(meta.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
