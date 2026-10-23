import { assetUrl } from './api.js';

/**
 * Baixa a imagem gerada. Imagens do próprio backend usam ?download=1;
 * imagens hospedadas fora (ImgBB) são baixadas via blob e, se o navegador
 * bloquear, abertas em nova aba para salvar manualmente.
 */
export async function downloadImage(img) {
  const name = `personagem-${img.id.slice(0, 8)}.png`;
  const url = assetUrl(img.downloadUrl || img.url);

  if (!img.remote) {
    triggerDownload(url, name);
    return;
  }
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error();
    const blobUrl = URL.createObjectURL(await res.blob());
    triggerDownload(blobUrl, name);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

function triggerDownload(href, name) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
