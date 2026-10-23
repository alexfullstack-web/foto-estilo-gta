/**
 * Erro de aplicação com status HTTP, código estável (usado pelo frontend)
 * e mensagem amigável em português.
 */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
