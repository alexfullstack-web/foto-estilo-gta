import crypto from 'node:crypto';

/**
 * Hospedagem temporária da foto enviada.
 *
 * O reAPI só aceita imagens de referência por URL pública (não aceita base64),
 * então a foto fica em MEMÓRIA, acessível por um link com token aleatório
 * de 256 bits, por poucos minutos. Ela é apagada assim que a geração termina
 * (com sucesso ou erro) — nunca é gravada em disco.
 */

const TTL_MS = 15 * 60 * 1000;
const inputs = new Map(); // token -> { buffer, mime, expiresAt }

export function hostInput(buffer, mime, ext) {
  const token = crypto.randomBytes(32).toString('hex');
  inputs.set(token, { buffer, mime, expiresAt: Date.now() + TTL_MS });
  return { token, path: `/api/inputs/${token}.${ext}` };
}

export function getInput(token) {
  const item = inputs.get(token);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    inputs.delete(token);
    return null;
  }
  return item;
}

export function dropInput(token) {
  inputs.delete(token);
}

setInterval(() => {
  const now = Date.now();
  for (const [token, item] of inputs) if (now > item.expiresAt) inputs.delete(token);
}, 60 * 1000).unref();
