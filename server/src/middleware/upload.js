import multer from 'multer';
import { config } from '../config.js';
import { AppError } from '../utils/AppError.js';

export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Upload em memória: a foto nunca é gravada em disco.
 */
export const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Math.floor(config.limits.effectiveUploadMb * 1024 * 1024), files: 1, fields: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new AppError(415, 'INVALID_FILE_TYPE', 'Formato não suportado. Envie uma imagem JPG, PNG ou WEBP.'));
    }
    cb(null, true);
  },
}).single('photo');
