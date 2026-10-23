import { config, getFullStatus } from '../config.js';
import { AppError } from '../utils/AppError.js';
import * as reapi from './providers/reapi.js';
import * as openai from './providers/openai.js';

const PROVIDERS = { reapi, openai };

/**
 * Ponto único de chamada da IA. O provedor é escolhido por AI_PROVIDER.
 * Para adicionar outro, crie services/providers/<nome>.js exportando transform().
 */
export async function transformPhoto(input) {
  const status = getFullStatus();
  if (!status.configured) {
    throw new AppError(503, 'AI_NOT_CONFIGURED', `A API de IA não está configurada no servidor. ${status.problem}`);
  }
  return PROVIDERS[config.provider].transform(input);
}
