import multer from 'multer';
import { config } from '../config.js';
import { AppError } from '../utils/AppError.js';

export function notFound(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Rota não encontrada: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Se a geração falhou, devolve o crédito reservado ao usuário
  req.quota?.release();

  let error = err;

  if (err instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: [413, 'FILE_TOO_LARGE', `A imagem é maior que ${config.limits.effectiveUploadMb} MB.`],
      LIMIT_FILE_COUNT: [400, 'TOO_MANY_FILES', 'Envie apenas uma foto por vez.'],
      LIMIT_UNEXPECTED_FILE: [400, 'UNEXPECTED_FIELD', 'Campo de arquivo inválido. Use o campo "photo".'],
    };
    const [status, code, message] = map[err.code] ?? [400, 'UPLOAD_ERROR', 'Falha no envio do arquivo.'];
    error = new AppError(status, code, message);
  } else if (!(err instanceof AppError)) {
    console.error('[erro inesperado]', err);
    error = new AppError(500, 'INTERNAL_ERROR', 'Ocorreu um erro interno. Tente novamente.');
  }

  res.status(error.status).json({
    error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
  });
}
