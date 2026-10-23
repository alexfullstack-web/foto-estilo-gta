import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const env = (name, fallback = '') => (process.env[name] ?? fallback).trim();

const onVercel = Boolean(process.env.VERCEL);

export const config = {
  port: toInt(process.env.PORT, 3001),
  onVercel,
  isProd: process.env.NODE_ENV === 'production' || onVercel,
  // Na Vercel sempre há proxy na frente (necessário para ler o IP real do visitante)
  trustProxy: process.env.TRUST_PROXY === 'true' || onVercel,
  corsOrigins: env('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  /** Qual provedor de IA usar: "reapi" ou "openai" */
  provider: env('AI_PROVIDER', 'reapi').toLowerCase(),
  timeoutMs: toInt(process.env.GENERATION_TIMEOUT_MS, 240_000),

  /** URL pública deste backend (necessária para o reAPI baixar a foto) */
  publicBaseUrl: env('PUBLIC_BASE_URL').replace(/\/$/, ''),
  // Só para testes locais com um servidor simulado. Nunca use em produção.
  allowLocalPublicUrl: process.env.ALLOW_LOCAL_PUBLIC_URL === 'true',

  /** Onde hospedar a foto para o reAPI baixar: "imgbb" (sem túnel) ou "self" (este backend) */
  inputHost: env('INPUT_HOST', 'imgbb').toLowerCase(),
  imgbb: {
    apiKey: env('IMGBB_API_KEY'),
    expirationSeconds: toInt(process.env.IMGBB_EXPIRATION_SECONDS, 600),
  },

  reapi: {
    apiKey: env('REAPI_API_KEY'),
    model: env('REAPI_MODEL', 'gpt-image-2'),
    quality: env('REAPI_QUALITY', 'medium'),
    resolution: env('REAPI_RESOLUTION', '1k'),
    baseUrl: env('REAPI_BASE_URL', 'https://reapi.ai/api/v1').replace(/\/$/, ''),
  },

  openai: {
    apiKey: env('OPENAI_API_KEY'),
    model: env('OPENAI_IMAGE_MODEL', 'gpt-image-2'),
    quality: env('OPENAI_IMAGE_QUALITY', 'medium'),
    baseUrl: env('OPENAI_BASE_URL', 'https://api.openai.com/v1').replace(/\/$/, ''),
  },

  limits: {
    maxUploadMb: toInt(process.env.MAX_UPLOAD_MB, 10),
    dailyPerIp: toInt(process.env.DAILY_LIMIT_PER_IP, 10),
    globalDaily: toInt(process.env.GLOBAL_DAILY_LIMIT, 200),
  },

  /** Onde guardar as imagens GERADAS: "disk" (pasta local) ou "imgbb" (obrigatório na Vercel) */
  resultStore: env('RESULT_STORE', onVercel ? 'imgbb' : 'disk').toLowerCase(),

  storage: {
    dir: path.resolve(__dirname, '..', 'storage', 'generated'),
    retentionHours: toInt(process.env.RESULT_RETENTION_HOURS, 24),
  },

  clientDist: path.resolve(__dirname, '..', '..', 'client', 'dist'),
};

const PLACEHOLDERS = ['', 'sk-...', 'rk_live_...', 'sua-chave-aqui', 'your-api-key'];
// Na Vercel o corpo da requisição é limitado a 4,5 MB
config.limits.effectiveUploadMb = onVercel ? Math.min(config.limits.maxUploadMb, 4) : config.limits.maxUploadMb;

export const hasKey = (key) => !PLACEHOLDERS.includes(key) && key.length >= 16;

const isLocalUrl = (url) => /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|192\.168\.|10\.)/i.test(url);

/**
 * Diz se o provedor escolhido está pronto e, se não estiver,
 * o que falta (mostrado no site e no log do servidor).
 */
export function getProviderStatus() {
  if (config.provider === 'openai') {
    const missing = hasKey(config.openai.apiKey) ? [] : ['OPENAI_API_KEY'];
    return {
      provider: 'openai',
      name: 'OpenAI Images API',
      model: config.openai.model,
      configured: missing.length === 0,
      missing,
      problem: missing.length ? 'Defina OPENAI_API_KEY em server/.env e reinicie o backend.' : null,
    };
  }

  if (config.provider === 'reapi') {
    const missing = [];
    const viaImgbb = config.inputHost === 'imgbb';
    if (!hasKey(config.reapi.apiKey)) missing.push('REAPI_API_KEY');
    if (viaImgbb && !hasKey(config.imgbb.apiKey)) missing.push('IMGBB_API_KEY');
    if (!viaImgbb && !config.publicBaseUrl) missing.push('PUBLIC_BASE_URL');

    let problem = null;
    if (!['imgbb', 'self'].includes(config.inputHost)) {
      problem = `INPUT_HOST="${config.inputHost}" é inválido. Use "imgbb" ou "self".`;
    } else if (missing.length) {
      problem = `Defina ${missing.join(' e ')} em server/.env e reinicie o backend.`;
    } else if (viaImgbb || config.allowLocalPublicUrl) {
      problem = null;
    } else if (isLocalUrl(config.publicBaseUrl)) {
      problem =
        'PUBLIC_BASE_URL aponta para um endereço local. O reAPI precisa baixar a foto pela internet: use um túnel (cloudflared) ou o domínio do servidor publicado.';
    } else if (!/^https:\/\//i.test(config.publicBaseUrl)) {
      problem = 'PUBLIC_BASE_URL precisa começar com https://';
    }

    return {
      provider: 'reapi',
      name: 'reAPI',
      model: config.reapi.model,
      configured: problem === null,
      missing,
      problem,
    };
  }

  return {
    provider: config.provider,
    name: config.provider,
    model: null,
    configured: false,
    missing: ['AI_PROVIDER'],
    problem: `AI_PROVIDER="${config.provider}" é inválido. Use "reapi" ou "openai".`,
  };
}

/** Problemas de infraestrutura que valem para qualquer provedor. */
function infraProblem() {
  if (!['disk', 'imgbb'].includes(config.resultStore)) {
    return { missing: [], problem: `RESULT_STORE="${config.resultStore}" é inválido. Use "disk" ou "imgbb".` };
  }
  if (config.onVercel && config.resultStore === 'disk') {
    return { missing: [], problem: 'Na Vercel não há disco permanente: use RESULT_STORE=imgbb.' };
  }
  if (config.resultStore === 'imgbb' && !hasKey(config.imgbb.apiKey)) {
    return { missing: ['IMGBB_API_KEY'], problem: 'Defina IMGBB_API_KEY (as imagens geradas são guardadas no ImgBB).' };
  }
  if (config.onVercel && config.provider === 'reapi' && config.inputHost === 'self') {
    return { missing: [], problem: 'Na Vercel use INPUT_HOST=imgbb (cada requisição pode cair numa instância diferente).' };
  }
  return null;
}

export function getFullStatus() {
  const status = getProviderStatus();
  const infra = infraProblem();
  if (status.configured && infra) {
    return { ...status, configured: false, missing: infra.missing, problem: infra.problem };
  }
  return status;
}

export const isProviderConfigured = () => getFullStatus().configured;
