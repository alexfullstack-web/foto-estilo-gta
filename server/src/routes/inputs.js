import { getInput } from '../services/inputHost.js';

/**
 * GET/HEAD /api/inputs/:token.ext — foto temporária para o provedor de IA baixar.
 * Fica FORA do CORS e do rate limit (quem acessa é o servidor do reAPI, não um navegador).
 * Cada acesso é registrado no log para facilitar o diagnóstico.
 */
export function serveInput(req, res) {
  const [token] = String(req.params.file).split('.');
  const item = /^[a-f0-9]{64}$/.test(token) ? getInput(token) : null;
  const who = `${req.get('user-agent') || 'sem user-agent'} | ${req.get('cf-connecting-ip') || req.ip}`;

  if (!item) {
    console.warn(`[inputs] ${req.method} ${token.slice(0, 8)}… → 404 (expirado ou inexistente) — ${who}`);
    return res.status(404).type('text/plain').send('Not found');
  }

  console.log(`[inputs] ${req.method} ${token.slice(0, 8)}… → 200 (${item.buffer.length} bytes) — ${who}`);
  res.set({
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Content-Length': item.buffer.length,
  });
  res.status(200).type(item.mime);
  if (req.method === 'HEAD') return res.end();
  res.end(item.buffer);
}
