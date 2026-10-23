import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { config, getFullStatus } from './config.js';
import { api } from './routes/api.js';
import { serveInput } from './routes/inputs.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { AppError } from './utils/AppError.js';
import { ensureStorage, startCleanupJob } from './services/storage.js';

const app = express();

app.set('trust proxy', config.trustProxy ? 1 : false);
app.disable('x-powered-by');

// Foto temporária para o reAPI baixar: antes de helmet/CORS/rate limit
app.get('/api/inputs/:file', serveInput);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://i.ibb.co'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'https://i.ibb.co'],
      },
    },
  })
);

// CORS só nas rotas da API. Permite: mesma origem (produção), origens do .env e
// ferramentas sem Origin (curl/Postman). Origens desconhecidas recebem 403.
app.use(
  '/api',
  cors((req, cb) => {
    const origin = req.get('Origin');
    const sameOrigin = origin === `${req.protocol}://${req.get('host')}`;
    if (!origin || sameOrigin || config.corsOrigins.includes(origin)) {
      return cb(null, { origin: true, allowedHeaders: ['Content-Type', 'X-Client-Id'] });
    }
    cb(new AppError(403, 'CORS_BLOCKED', 'Origem não permitida.'));
  })
);

app.use(express.json({ limit: '100kb' }));

// Limite geral contra abuso (todas as rotas /api)
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas requisições. Aguarde alguns minutos.' } }),
  })
);

app.use('/api', api);
app.use('/api', notFound);

// Página inicial do backend (útil para conferir o deploy na Vercel)
app.get('/', (_req, res, next) => {
  if (fs.existsSync(path.join(config.clientDist, 'index.html'))) return next();
  res.json({ name: 'foto-estilo-gta API', status: 'ok', health: '/api/health' });
});

// Em produção, o mesmo servidor entrega o frontend compilado (client/dist)
if (fs.existsSync(path.join(config.clientDist, 'index.html'))) {
  app.use(express.static(config.clientDist, { maxAge: '7d', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

if (config.resultStore === 'disk') {
  ensureStorage()
    .then(startCleanupJob)
    .catch((err) => console.error('[storage] Não foi possível preparar a pasta de imagens:', err.message));
}

// Na Vercel quem recebe as requisições é a plataforma: só exportamos o app.
export default app;

if (!config.onVercel) app.listen(config.port, () => {
  console.log(`\n🚀 API rodando em http://localhost:${config.port}`);
  const ai = getFullStatus();
  if (ai.configured) {
    console.log(`✅ IA configurada — ${ai.name}, modelo: ${ai.model}`);
    if (ai.provider === 'reapi') {
      console.log(
        config.inputHost === 'imgbb'
          ? '🖼️  Fotos enviadas ao ImgBB com expiração automática (sem túnel)'
          : `🌐 Fotos servidas temporariamente via ${config.publicBaseUrl}/api/inputs/...`
      );
    }
  } else {
    console.warn(`⚠️  IA NÃO configurada (${ai.name}): ${ai.problem}`);
  }
  console.log(`📏 Limites: ${config.limits.dailyPerIp}/dia por IP · ${config.limits.globalDaily}/dia no total · upload até ${config.limits.effectiveUploadMb} MB\n`);
});
