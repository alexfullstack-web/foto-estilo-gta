export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

/** Validação no navegador (o backend valida de novo, inclusive o conteúdo real). */
/** Antes da compressão aceitamos até 25 MB; depois dela vale o limite do servidor. */
export const MAX_RAW_MB = 25;

export function validatePhoto(file, maxMb = MAX_RAW_MB) {
  if (!file) return 'Selecione uma foto.';
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Formato não suportado. Use JPG, PNG ou WEBP.';
  }
  if (file.size > maxMb * 1024 * 1024) {
    return `A imagem tem ${(file.size / 1024 / 1024).toFixed(1)} MB. O máximo é ${maxMb} MB.`;
  }
  if (file.size < 10 * 1024) {
    return 'A imagem é pequena demais. Use uma foto com boa resolução.';
  }
  return null;
}

/** Garante que o arquivo abre como imagem e tem tamanho mínimo útil. */
export function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight, url });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler esta imagem. O arquivo pode estar corrompido.'));
    };
    img.src = url;
  });
}
