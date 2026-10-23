import { config } from '../config.js';
import { AppError } from '../utils/AppError.js';

/**
 * Envia a foto para o ImgBB (https://api.imgbb.com) e devolve a URL pública direta.
 * A imagem é apagada automaticamente pelo ImgBB após IMGBB_EXPIRATION_SECONDS (padrão 10 min).
 * Usado para o reAPI baixar a foto sem precisar de túnel nem de servidor público.
 */
export async function uploadToImgbb(buffer, filename, expirationSeconds = config.imgbb.expirationSeconds) {
  const { apiKey } = config.imgbb;
  const expiration = Math.min(Math.max(expirationSeconds, 60), 15_552_000);

  const form = new FormData();
  form.append('image', buffer.toString('base64'));
  form.append('name', filename);

  let res;
  try {
    res = await fetch(`${process.env.IMGBB_BASE_URL || 'https://api.imgbb.com'}/1/upload?expiration=${expiration}&key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    console.error(`[ImgBB] Falha de conexão: ${err.cause?.code || err.message}`);
    throw new AppError(502, 'INPUT_UPLOAD_FAILED', 'Não foi possível enviar a foto para o serviço temporário (ImgBB). Verifique a internet do servidor.');
  }

  const payload = await res.json().catch(() => null);
  const url = payload?.data?.url;
  if (!res.ok || !url) {
    const msg = payload?.error?.message || `HTTP ${res.status}`;
    console.error(`[ImgBB] Erro no upload: ${msg}`);
    if (res.status === 400 && /key/i.test(msg)) {
      throw new AppError(502, 'INPUT_UPLOAD_FAILED', 'A chave do ImgBB foi recusada. Verifique IMGBB_API_KEY no servidor.');
    }
    throw new AppError(502, 'INPUT_UPLOAD_FAILED', 'O serviço temporário de imagens (ImgBB) recusou a foto. Tente novamente.', config.isProd ? undefined : { message: msg });
  }

  console.log(`[ImgBB] ${filename} enviado (expira em ${expiration}s)`);
  return url;
}
