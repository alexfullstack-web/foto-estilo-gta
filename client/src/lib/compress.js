/**
 * Reduz a foto no navegador antes do envio (máx. 2048 px no maior lado, JPEG 90%).
 * Deixa o upload rápido e abaixo do limite de 4,5 MB da Vercel, sem perda visível
 * para a IA, que trabalha em ~1024–1536 px.
 */
const MAX_SIDE = 2048;
const TARGET_BYTES = 3 * 1024 * 1024;

export async function compressPhoto(file, { width, height }) {
  const longest = Math.max(width, height);
  if (longest <= MAX_SIDE && file.size <= TARGET_BYTES) return file;

  const scale = Math.min(1, MAX_SIDE / longest);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // PNG com transparência vira fundo branco no JPEG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  for (const quality of [0.9, 0.82, 0.72]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && (blob.size <= TARGET_BYTES || quality === 0.72)) {
      const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
    }
  }
  return file;
}
