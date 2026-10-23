/**
 * npm run check — confere a configuração da IA sem gerar imagem nem gastar créditos.
 */
import { config, getProviderStatus, getFullStatus } from '../config.js';

const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => {
  console.error(`❌ ${m}\n`);
  process.exit(1);
};

console.log('\n🔎 Verificando configuração da IA...\n');

const status = getProviderStatus();
console.log(`• Provedor: ${status.name}`);
console.log(`• Modelo:   ${status.model ?? '—'}`);
console.log(`• Imagens geradas guardadas em: ${config.resultStore === 'imgbb' ? 'ImgBB' : 'disco local'}\n`);
{
  const full = getFullStatus();
  if (status.configured && !full.configured) fail(full.problem);
}

if (status.missing.includes('AI_PROVIDER')) fail(status.problem);

if (config.provider === 'reapi') {
  if (status.missing.includes('REAPI_API_KEY')) fail('REAPI_API_KEY ausente. Crie em https://reapi.ai/settings/apikeys');

  // Consulta uma tarefa inexistente: 404 = chave válida, 401 = chave inválida. Não gasta créditos.
  try {
    const res = await fetch(`${config.reapi.baseUrl}/tasks/task_verificacao_inexistente`, {
      headers: { Authorization: `Bearer ${config.reapi.apiKey}` },
    });
    if (res.status === 401) fail('O reAPI recusou a chave (401). Gere outra em https://reapi.ai/settings/apikeys');
    ok('Chave do reAPI aceita.');
  } catch (err) {
    fail(`Não foi possível conectar ao reAPI: ${err.message}`);
  }

  if (config.inputHost === 'imgbb') {
    if (status.missing.includes('IMGBB_API_KEY')) fail('IMGBB_API_KEY ausente. Crie grátis em https://api.imgbb.com');
    ok('Fotos serão enviadas ao ImgBB (não precisa de túnel nem de PUBLIC_BASE_URL).');
    console.log('\n🎉 Tudo pronto para gerar imagens.\n');
    process.exit(0);
  }

  if (status.missing.includes('PUBLIC_BASE_URL')) {
    fail('PUBLIC_BASE_URL ausente. O reAPI precisa baixar a foto por uma URL pública (veja o README, seção do túnel).');
  }
  if (status.problem) fail(status.problem);

  // Confere se a URL pública chega neste backend (o servidor precisa estar rodando)
  try {
    const res = await fetch(`${config.publicBaseUrl}/api/health`, { signal: AbortSignal.timeout(15_000) });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.status === 'ok') ok(`PUBLIC_BASE_URL responde: ${config.publicBaseUrl}`);
    else fail(`PUBLIC_BASE_URL respondeu ${res.status}, mas não parece ser este backend.`);
  } catch (err) {
    const cause = err.cause?.code || (err.name === 'TimeoutError' ? 'tempo esgotado' : err.message);
    fail(`PUBLIC_BASE_URL (${config.publicBaseUrl}) não respondeu (${cause}). O backend e o túnel estão rodando? Dica: use INPUT_HOST=imgbb para não depender de túnel.`);
  }
} else if (config.provider === 'openai') {
  if (status.problem) fail(status.problem);
  try {
    const res = await fetch(`${config.openai.baseUrl}/models/${encodeURIComponent(config.openai.model)}`, {
      headers: { Authorization: `Bearer ${config.openai.apiKey}` },
    });
    if (res.status === 401) fail('A OpenAI recusou a chave (401).');
    if (res.status === 404) fail(`Modelo "${config.openai.model}" não disponível para sua conta. Ajuste OPENAI_IMAGE_MODEL.`);
    if (!res.ok) fail(`Resposta inesperada da OpenAI (${res.status}).`);
    ok(`Chave válida e modelo "${config.openai.model}" disponível.`);
  } catch (err) {
    fail(`Não foi possível conectar à OpenAI: ${err.message}`);
  }
}

console.log('\n🎉 Tudo pronto para gerar imagens.\n');
