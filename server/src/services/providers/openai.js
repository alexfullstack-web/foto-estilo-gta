import { config } from '../../config.js';
import { AppError } from '../../utils/AppError.js';

/**
 * OpenAI Images API — POST /v1/images/edits (envia a foto direto, multipart).
 */

const SIZES = { portrait: '1024x1536', square: '1024x1024', landscape: '1536x1024' };

// input_fidelity=high só é aceito por gpt-image-1 e gpt-image-1.5
const supportsHighFidelity = (model) => /^gpt-image-1(\.5)?(-\d{4}-\d{2}-\d{2})?$/.test(model);

export async function transform({ buffer, mime, ext, prompt, format, safetyId }) {
  const { apiKey, model, quality, baseUrl } = config.openai;

  const form = new FormData();
  form.append('model', model);
  form.append('prompt', prompt);
  form.append('image', new Blob([buffer], { type: mime }), `foto.${ext}`);
  form.append('size', SIZES[format] ?? SIZES.portrait);
  form.append('quality', quality);
  form.append('output_format', 'png');
  form.append('n', '1');
  if (supportsHighFidelity(model)) form.append('input_fidelity', 'high');
  if (safetyId) form.append('safety_identifier', safetyId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  let response;
  try {
    response = await fetch(`${baseUrl}/images/edits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AppError(504, 'AI_TIMEOUT', 'A IA demorou demais para responder. Tente novamente em instantes.');
    }
    throw new AppError(502, 'AI_UNREACHABLE', 'Não foi possível conectar ao serviço de IA. Verifique a conexão do servidor.');
  } finally {
    clearTimeout(timer);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw mapError(response.status, payload);

  const b64 = payload?.data?.[0]?.b64_json;
  if (!b64) throw new AppError(502, 'AI_EMPTY_RESPONSE', 'A IA não retornou nenhuma imagem. Tente novamente.');

  return { buffer: Buffer.from(b64, 'base64'), model };
}

function mapError(status, payload) {
  const code = String(payload?.error?.code || payload?.error?.type || '');
  const msg = payload?.error?.message || 'sem detalhes';
  const details = config.isProd ? undefined : { provider: 'openai', status, code, message: msg };
  console.error(`[OpenAI] Erro ${status} (${code}): ${msg}`);

  if (/moderation|safety|content_policy/i.test(code + msg)) {
    return new AppError(422, 'CONTENT_BLOCKED', 'O filtro de segurança da IA recusou esta foto ou pedido. Tente outra foto, de preferência um retrato simples.', details);
  }
  if (status === 401) return new AppError(502, 'AI_AUTH_FAILED', 'A chave da OpenAI foi recusada. Verifique OPENAI_API_KEY no servidor.', details);
  if (status === 403) {
    return new AppError(502, 'AI_FORBIDDEN', `Sua conta da OpenAI não tem acesso ao modelo "${config.openai.model}". Alguns modelos exigem verificação da organização.`, details);
  }
  if (status === 429 && /insufficient_quota|billing/i.test(code + msg)) {
    return new AppError(503, 'AI_NO_CREDITS', 'Os créditos da API de IA acabaram. Avise o administrador do site.', details);
  }
  if (status === 429) return new AppError(429, 'AI_RATE_LIMITED', 'A IA está recebendo muitos pedidos agora. Aguarde um minuto e tente de novo.', details);
  if (status === 400) return new AppError(400, 'AI_BAD_REQUEST', 'A IA não conseguiu processar esta imagem. Tente outra foto.', details);
  return new AppError(502, 'AI_UNAVAILABLE', 'O serviço de IA está instável no momento. Tente novamente em instantes.', details);
}
