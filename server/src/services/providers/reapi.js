import { config } from '../../config.js';
import { AppError } from '../../utils/AppError.js';
import { hostInput, dropInput } from '../inputHost.js';
import { uploadToImgbb } from '../imgbb.js';

/**
 * reAPI — https://reapi.ai/docs
 *  1. POST {base}/images/generations  (JSON, foto por URL pública em image_urls)
 *  2. GET  {base}/tasks/{id}          (polling até completed/failed — grátis)
 *  3. Baixa o PNG de output.image_urls[0]
 */

const RATIOS = { portrait: '2:3', square: '1:1', landscape: '3:2' };
const FIRST_POLL_MS = 8_000;
const POLL_EVERY_MS = 3_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Monta o corpo conforme a família do modelo (cada uma usa campos diferentes). */
function buildBody({ model, prompt, imageUrl, format }) {
  const ratio = RATIOS[format] ?? RATIOS.portrait;
  const body = { model, prompt, image_urls: [imageUrl] };

  if (/^(nano-banana|gemini)/i.test(model)) {
    body.aspect_ratio = ratio; // Nano Banana usa aspect_ratio
  } else {
    body.size = ratio;
    body.resolution = config.reapi.resolution;
    body.n = 1;
    // Só o canal "official" do GPT Image aceita quality
    if (/official/i.test(model)) body.quality = config.reapi.quality;
  }
  return body;
}

async function call(path, init = {}) {
  const res = await fetch(`${config.reapi.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.reapi.apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(30_000),
  }).catch((err) => {
    throw new AppError(502, 'AI_UNREACHABLE', 'Não foi possível conectar ao reAPI. Verifique a conexão do servidor.', {
      cause: err.message,
    });
  });
  const payload = await res.json().catch(() => null);
  return { res, payload };
}

export async function transform({ buffer, mime, ext, prompt, format }) {
  const { model } = config.reapi;
  const viaImgbb = config.inputHost === 'imgbb';
  const hosted = viaImgbb ? null : hostInput(buffer, mime, ext);

  try {
    // 0) Publica a foto por uma URL que o reAPI consiga baixar
    let imageUrl;
    if (viaImgbb) {
      imageUrl = await uploadToImgbb(buffer, `foto.${ext}`);
    } else {
      imageUrl = `${config.publicBaseUrl}${hosted.path}`;
      await assertReachable(imageUrl); // pega túnel caído ou URL errada
    }

    // 1) Envia a tarefa
    const submit = await call('/images/generations', {
      method: 'POST',
      body: JSON.stringify(buildBody({ model, prompt, imageUrl, format })),
    });
    if (!submit.res.ok) throw mapHttpError(submit.res, submit.payload);

    const taskId = submit.payload?.id;
    if (!taskId) throw new AppError(502, 'AI_EMPTY_RESPONSE', 'O reAPI não retornou o identificador da tarefa.');
    console.log(`[reAPI] Tarefa ${taskId} criada (${model})`);

    // 2) Acompanha até terminar
    const deadline = Date.now() + config.timeoutMs;
    await sleep(FIRST_POLL_MS);

    while (Date.now() < deadline) {
      const poll = await call(`/tasks/${encodeURIComponent(taskId)}`);

      if (poll.res.status === 429) {
        await sleep(Number(poll.res.headers.get('retry-after') || 5) * 1000);
        continue;
      }
      if (!poll.res.ok) throw mapHttpError(poll.res, poll.payload);

      const task = poll.payload;
      if (task.status === 'completed') {
        const url = task.output?.image_urls?.[0];
        if (!url) throw new AppError(502, 'AI_EMPTY_RESPONSE', 'A IA não retornou nenhuma imagem. Tente novamente.');
        console.log(`[reAPI] Tarefa ${taskId} concluída — ${task.usage?.credits ?? '?'} créditos`);
        return { buffer: await download(url), model };
      }
      if (task.status === 'failed') throw mapTaskError(task);

      await sleep(POLL_EVERY_MS);
    }

    throw new AppError(504, 'AI_TIMEOUT', 'A IA demorou demais para responder. Tente novamente em instantes.');
  } finally {
    if (hosted) dropInput(hosted.token); // a foto sai da memória e o link deixa de funcionar
  }
}

async function assertReachable(url) {
  let status = 'sem resposta';
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15_000) });
    if (res.ok) return;
    status = `HTTP ${res.status}`;
  } catch (err) {
    const cause = err.cause?.code || err.cause?.message;
    // Falha de DNS só NESTE computador: o reAPI usa outro DNS e pode conseguir. Avisa e segue.
    if (['ENOTFOUND', 'EAI_AGAIN'].includes(err.cause?.code)) {
      console.warn(
        `[reAPI] Aviso: este computador não resolveu o endereço do túnel (${err.cause.code}). ` +
          'Seguindo assim mesmo — o reAPI usa outro DNS. Se falhar, troque o DNS do Windows para 1.1.1.1.'
      );
      return;
    }
    status = err.name === 'TimeoutError' ? 'tempo esgotado (15s)' : cause ? `${err.message}: ${cause}` : err.message;
  }
  console.error(`[reAPI] O link público da foto não respondeu (${status}): ${url}`);
  throw new AppError(
    502,
    'AI_INPUT_UNREACHABLE',
    'O servidor não conseguiu acessar o próprio link público. Confira se o túnel (cloudflared) está aberto e se PUBLIC_BASE_URL é a URL atual dele.',
    config.isProd ? undefined : { url, status }
  );
}

async function download(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) }).catch(() => null);
  if (!res?.ok) throw new AppError(502, 'AI_DOWNLOAD_FAILED', 'A imagem foi gerada, mas não foi possível baixá-la. Tente novamente.');
  return Buffer.from(await res.arrayBuffer());
}

function mapHttpError(res, payload) {
  const code = Number(payload?.error?.code) || 0;
  const msg = payload?.error?.message || 'sem detalhes';
  const details = config.isProd ? undefined : { provider: 'reapi', status: res.status, code, message: msg };
  console.error(`[reAPI] Erro HTTP ${res.status} (${code}): ${msg}`);

  if (res.status === 401) {
    return new AppError(502, 'AI_AUTH_FAILED', 'A chave do reAPI foi recusada. Verifique REAPI_API_KEY no servidor.', details);
  }
  if (res.status === 402 || code === 30001) {
    return new AppError(503, 'AI_NO_CREDITS', 'Os créditos do reAPI acabaram. Avise o administrador do site.', details);
  }
  if (res.status === 429) {
    return new AppError(429, 'AI_RATE_LIMITED', 'A IA está recebendo muitos pedidos agora. Aguarde um minuto e tente de novo.', details);
  }
  if (code === 20004) {
    return new AppError(502, 'AI_BAD_MODEL', `O modelo "${config.reapi.model}" não é aceito pelo reAPI. Ajuste REAPI_MODEL.`, details);
  }
  if (res.status === 400) {
    return new AppError(400, 'AI_BAD_REQUEST', 'A IA não aceitou o pedido. Tente outra foto ou outro formato.', details);
  }
  return new AppError(502, 'AI_UNAVAILABLE', 'O serviço de IA está instável no momento. Tente novamente em instantes.', details);
}

function mapTaskError(task) {
  const code = Number(task.error?.code) || 0;
  const msg = task.error?.message || 'sem detalhes';
  const details = config.isProd ? undefined : { provider: 'reapi', taskId: task.id, code, message: msg, credits: task.usage?.credits };
  console.error(`[reAPI] Tarefa ${task.id} falhou (${code}): ${msg}`);

  if (code === 80006 || /content policy|moderat|safety/i.test(msg)) {
    return new AppError(422, 'CONTENT_BLOCKED', 'O filtro de segurança da IA recusou esta foto ou pedido. Tente outra foto, de preferência um retrato simples.', details);
  }
  if (code === 80007 || /download|fetch|url|image_urls/i.test(msg)) {
    return new AppError(
      502,
      'AI_INPUT_UNREACHABLE',
      config.inputHost === 'imgbb'
        ? 'O reAPI não conseguiu baixar a foto do ImgBB. Tente novamente em instantes.'
        : 'O reAPI não conseguiu baixar a sua foto pelo link público. Veja no terminal do backend se aparece alguma linha [inputs] — ela mostra se o reAPI chegou ao seu servidor.',
      details
    );
  }
  if (code === 80002) {
    return new AppError(504, 'AI_TIMEOUT', 'A IA demorou demais para responder. Tente novamente em instantes.', details);
  }
  return new AppError(502, 'AI_UNAVAILABLE', 'A IA não conseguiu gerar a imagem desta vez. Tente novamente.', details);
}
