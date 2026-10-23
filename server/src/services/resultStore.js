import { config } from '../config.js';
import * as storage from './storage.js';
import { uploadToImgbb } from './imgbb.js';

/**
 * Guarda a imagem gerada e devolve o objeto público enviado ao navegador.
 *  - disk:  pasta server/storage (PC ou VPS) — servida por /api/images/:id
 *  - imgbb: ImgBB com expiração automática (Vercel e outros ambientes sem disco)
 */
export async function saveGenerated(id, buffer, meta) {
  if (config.resultStore === 'imgbb') {
    const seconds = config.storage.retentionHours * 3600;
    const url = await uploadToImgbb(buffer, `personagem-${id.slice(0, 8)}.png`, seconds);
    return {
      id,
      url,
      downloadUrl: url,
      remote: true,
      scenario: meta.scenario,
      style: meta.style,
      format: meta.format,
      createdAt: meta.createdAt,
      expiresAt: new Date(Date.parse(meta.createdAt) + seconds * 1000).toISOString(),
    };
  }

  await storage.saveResult(id, buffer, meta);
  return { ...storage.toPublic({ id, ...meta }), remote: false };
}
