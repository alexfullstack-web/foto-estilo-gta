/**
 * "Seus resultados" ficam salvos neste navegador (funciona em qualquer hospedagem,
 * inclusive Vercel, onde o servidor não tem disco permanente).
 */
const KEY = 'fotogta.gallery';
const MAX_ITEMS = 24;

export function loadGallery() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    const now = Date.now();
    return Array.isArray(list) ? list.filter((img) => img?.id && img?.url && (!img.expiresAt || Date.parse(img.expiresAt) > now)) : [];
  } catch {
    return [];
  }
}

export function saveGallery(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {
    /* armazenamento indisponível: a galeria vale só para esta visita */
  }
}
