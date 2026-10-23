import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

/**
 * Armazena apenas as imagens GERADAS (nunca a foto original),
 * com metadados em JSON. Os arquivos expiram automaticamente.
 */

const DIR = config.storage.dir;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidId = (id) => typeof id === 'string' && UUID_RE.test(id);

const imagePath = (id) => path.join(DIR, `${id}.png`);
const metaPath = (id) => path.join(DIR, `${id}.json`);

export async function ensureStorage() {
  await fs.mkdir(DIR, { recursive: true });
}

export async function saveResult(id, buffer, meta) {
  await fs.writeFile(imagePath(id), buffer);
  await fs.writeFile(metaPath(id), JSON.stringify({ id, ...meta }, null, 2));
}

export async function getMeta(id) {
  if (!isValidId(id)) return null;
  try {
    return JSON.parse(await fs.readFile(metaPath(id), 'utf8'));
  } catch {
    return null;
  }
}

export function getImagePath(id) {
  return isValidId(id) ? imagePath(id) : null;
}

export async function listByClient(clientId, limit = 24) {
  if (!clientId) return [];
  const files = await fs.readdir(DIR).catch(() => []);
  const metas = await Promise.all(
    files
      .filter((f) => f.endsWith('.json'))
      .map((f) => fs.readFile(path.join(DIR, f), 'utf8').then(JSON.parse).catch(() => null))
  );
  return metas
    .filter((m) => m && m.clientId === clientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function removeResult(id) {
  if (!isValidId(id)) return;
  await Promise.allSettled([fs.unlink(imagePath(id)), fs.unlink(metaPath(id))]);
}

export async function cleanupExpired() {
  const maxAge = config.storage.retentionHours * 3600 * 1000;
  const files = await fs.readdir(DIR).catch(() => []);
  let removed = 0;
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    const id = file.replace('.json', '');
    const meta = await getMeta(id);
    if (!meta || Date.now() - Date.parse(meta.createdAt) > maxAge) {
      await removeResult(id);
      removed++;
    }
  }
  if (removed) console.log(`[storage] ${removed} imagem(ns) expirada(s) removida(s).`);
}

export function startCleanupJob() {
  cleanupExpired();
  const timer = setInterval(cleanupExpired, 30 * 60 * 1000);
  timer.unref();
}

export function toPublic(meta) {
  return {
    id: meta.id,
    url: `/api/images/${meta.id}`,
    downloadUrl: `/api/images/${meta.id}?download=1`,
    scenario: meta.scenario,
    style: meta.style,
    format: meta.format,
    createdAt: meta.createdAt,
    expiresAt: new Date(Date.parse(meta.createdAt) + config.storage.retentionHours * 3600 * 1000).toISOString(),
  };
}
