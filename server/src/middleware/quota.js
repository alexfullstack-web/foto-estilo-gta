import { config } from '../config.js';
import { AppError } from '../utils/AppError.js';

/**
 * Limite diário de gerações por IP + teto global do site.
 * Mantido em memória (reinicia junto com o servidor). Para várias
 * instâncias em produção, troque por Redis ou banco de dados.
 */

const perIp = new Map(); // ip -> { day, used, inFlight }
let globalUsage = { day: today(), used: 0 };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextReset() {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

function entryFor(ip) {
  const day = today();
  let entry = perIp.get(ip);
  if (!entry || entry.day !== day) {
    entry = { day, used: 0, inFlight: false };
    perIp.set(ip, entry);
  }
  if (globalUsage.day !== day) globalUsage = { day, used: 0 };
  return entry;
}

export function getQuota(ip) {
  const entry = entryFor(ip);
  const limit = config.limits.dailyPerIp;
  return { limit, used: entry.used, remaining: Math.max(0, limit - entry.used), resetAt: nextReset() };
}

/** Reserva uma geração antes de chamar a IA; devolve se a geração falhar. */
export function reserveGeneration(req, _res, next) {
  const entry = entryFor(req.ip);

  if (entry.inFlight) {
    return next(new AppError(429, 'GENERATION_IN_PROGRESS', 'Você já tem uma imagem sendo gerada. Aguarde ela terminar.'));
  }
  if (entry.used >= config.limits.dailyPerIp) {
    return next(
      new AppError(429, 'DAILY_LIMIT_REACHED', `Você atingiu o limite de ${config.limits.dailyPerIp} imagens por dia. Volte amanhã!`, {
        resetAt: nextReset(),
      })
    );
  }
  if (globalUsage.used >= config.limits.globalDaily) {
    return next(new AppError(503, 'GLOBAL_LIMIT_REACHED', 'O site atingiu o limite diário de gerações. Tente novamente amanhã.'));
  }

  entry.used++;
  entry.inFlight = true;
  globalUsage.used++;

  let settled = false;
  req.quota = {
    release() {
      if (settled) return;
      settled = true;
      entry.used = Math.max(0, entry.used - 1);
      globalUsage.used = Math.max(0, globalUsage.used - 1);
      entry.inFlight = false;
    },
    commit() {
      if (settled) return;
      settled = true;
      entry.inFlight = false;
    },
  };
  next();
}

// Limpa entradas de dias anteriores para não crescer indefinidamente
setInterval(() => {
  const day = today();
  for (const [ip, entry] of perIp) if (entry.day !== day && !entry.inFlight) perIp.delete(ip);
}, 60 * 60 * 1000).unref();
