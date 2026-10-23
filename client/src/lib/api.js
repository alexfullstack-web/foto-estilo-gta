const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/** Identificador anônimo do navegador, usado só para montar "Seus resultados". */
export function getClientId() {
  const KEY = 'fotogta.clientId';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return (window.__fotogtaClientId ??= crypto.randomUUID());
  }
}

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { 'X-Client-Id': getClientId(), ...(options.headers || {}) },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(
      res.status,
      err?.code || 'UNKNOWN_ERROR',
      err?.message || `Erro inesperado (${res.status}).`,
      err?.details
    );
  }
  return data;
}

export const api = {
  health: () => request('/api/health'),
  quota: () => request('/api/quota'),
  remove: (id) => request(`/api/images/${id}`, { method: 'DELETE' }),
  generate: ({ file, scenario, style, format }) => {
    const body = new FormData();
    body.append('scenario', scenario);
    body.append('style', style);
    body.append('format', format);
    body.append('photo', file);
    return request('/api/generate', { method: 'POST', body });
  },
};

/** URLs absolutas (ImgBB) passam direto; caminhos /api/... recebem o endereço do backend. */
export const assetUrl = (path) => (/^https?:\/\//i.test(path) ? path : `${BASE}${path}`);
