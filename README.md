# Foto em Personagem — estilo GTA com IA

Site que transforma uma foto pessoal em um personagem ilustrado no visual das capas e telas de carregamento clássicas, usando IA real.

- **Frontend:** React 18 + JavaScript + Vite
- **Backend:** Node.js + Express (as chaves de API ficam só aqui)
- **IA:** [reAPI](https://reapi.ai) por padrão (`gpt-image-2`), ou OpenAI direto — escolha com `AI_PROVIDER`

---

## 1. Requisitos

- **Node.js 20 ou superior** (`node -v` para conferir)
- Uma conta no **reAPI** e uma chave em https://reapi.ai/settings/apikeys
  - Contas novas recebem créditos de teste; depois disso cada imagem é cobrada (1 crédito = US$ 0,001).
- Para desenvolvimento local: **cloudflared** (túnel gratuito, explicado abaixo)

## 2. Instalação

```bash
npm install
```

Esse único comando instala a raiz, o `server/` e o `client/` (não usa npm workspaces, então funciona em qualquer drive, inclusive exFAT/pendrive).

## 3. Configuração

```bash
# Windows (PowerShell)
copy server\.env.example server\.env

# macOS / Linux
cp server/.env.example server/.env
```

### Como a foto chega ao reAPI

O reAPI **não aceita a foto enviada direto** (recusa base64): ele baixa a imagem de um link público. Há duas formas:

**Opção A — ImgBB (recomendada, sem túnel)**
1. Crie uma conta grátis em https://imgbb.com e pegue a chave em https://api.imgbb.com
2. No `server/.env`:
   ```env
   AI_PROVIDER=reapi
   REAPI_API_KEY=sua-chave-do-reapi
   INPUT_HOST=imgbb
   IMGBB_API_KEY=sua-chave-do-imgbb
   ```
O backend envia a foto ao ImgBB com expiração automática (10 minutos por padrão) e passa o link ao reAPI.
A foto fica nesse período num serviço de terceiros — o site informa isso ao usuário.

**Opção B — o próprio backend serve a foto (`INPUT_HOST=self`)**
A foto fica só na memória, num link com token aleatório que some ao fim da geração. Exige que o backend
esteja acessível pela internet em `PUBLIC_BASE_URL`: em produção, o domínio do servidor; no PC, um túnel:

```bash
winget install --id Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3001
```
e `PUBLIC_BASE_URL=https://....trycloudflare.com` (a URL muda a cada execução e túneis rápidos podem cair).

### Conferir a configuração (não gasta créditos)

Com o backend (e o túnel) rodando:

```bash
npm run check
```

Ele valida a chave do reAPI e se a `PUBLIC_BASE_URL` realmente chega no seu backend.

> Sem a configuração completa, o site abre normalmente, mas mostra o aviso **"IA não configurada"** dizendo o que falta, e o botão de gerar fica desativado. Nada é simulado.

### Variáveis do backend (`server/.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `AI_PROVIDER` | `reapi` | `reapi` ou `openai` |
| `REAPI_API_KEY` | — | Chave do reAPI |
| `REAPI_MODEL` | `gpt-image-2` | `gpt-image-2`, `gpt-image-2-official`, `nano-banana-2-lite` |
| `REAPI_RESOLUTION` | `1k` | `1k`, `2k`, `4k` (modelos GPT Image) |
| `REAPI_QUALITY` | `medium` | Só para `gpt-image-2-official`: `low`, `medium`, `high`, `auto` |
| `INPUT_HOST` | `imgbb` | `imgbb` (sem túnel) ou `self` (backend serve a foto) |
| `IMGBB_API_KEY` | — | Chave grátis do ImgBB (com `INPUT_HOST=imgbb`) |
| `IMGBB_EXPIRATION_SECONDS` | `600` | Quando o ImgBB apaga a foto (mín. 60) |
| `PUBLIC_BASE_URL` | — | URL https pública deste backend (só com `INPUT_HOST=self`) |
| `OPENAI_API_KEY` | — | Só se `AI_PROVIDER=openai` |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2` | Modelo da OpenAI |
| `OPENAI_IMAGE_QUALITY` | `medium` | `low`, `medium`, `high`, `auto` |
| `GENERATION_TIMEOUT_MS` | `240000` | Tempo máximo de espera pela IA |
| `MAX_UPLOAD_MB` | `10` | Tamanho máximo da foto |
| `DAILY_LIMIT_PER_IP` | `10` | Gerações por IP por dia |
| `GLOBAL_DAILY_LIMIT` | `200` | Teto diário do site inteiro (protege seus créditos) |
| `RESULT_RETENTION_HOURS` | `24` | Tempo até as imagens geradas serem apagadas |
| `RESULT_STORE` | `disk` (`imgbb` na Vercel) | Onde guardar as imagens geradas |
| `CORS_ORIGINS` | `http://localhost:5173` | Origens extras permitidas |
| `TRUST_PROXY` | `false` | `true` atrás de Nginx/Render/Railway |

### Variáveis do frontend (`client/.env`, opcional)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | Só se o backend estiver em outro domínio |
| `VITE_BRAND_NAME` / `VITE_BRAND_SUFFIX` | Nome exibido no site (padrão `AlexSousa` + `.IA`) |

## 4. Executar em desenvolvimento

```bash
npm run dev
```

- Site: http://localhost:5173
- API: http://localhost:3001 (o Vite redireciona `/api` para ela)

## 5. Produção

```bash
npm run build   # gera client/dist
npm start       # Express serve a API e o site em http://localhost:3001
```

Defina `NODE_ENV=production` no `server/.env` para esconder detalhes técnicos dos erros.

## 6. Publicar na Vercel

A Vercel detecta o `client` (Vite) e o `server` (Express) e publica os dois num **único projeto**
com o preset **Services**: o site em `/` e a API em `/api`, no mesmo domínio. Por isso não é preciso
`VITE_API_URL` nem `CORS_ORIGINS`.

Na Vercel não existe disco permanente, então a API guarda as imagens geradas no ImgBB (`RESULT_STORE=imgbb`)
e a galeria "Seus resultados" fica salva no navegador. A foto é comprimida no navegador antes do envio,
para caber no limite de 4,5 MB por requisição.

### 6.1 Suba o código para o GitHub

```powershell
git init
git add .
git commit -m "Foto estilo GTA"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/foto-estilo-gta.git
git push -u origin main
```

O `.gitignore` já impede o envio de `.env`, `node_modules`, `client/dist` e `server/storage`.

### 6.2 Crie o projeto

1. Em https://vercel.com/new importe o repositório.
2. Deixe **Root Directory = `./`** e **Application Preset = Services** (não clique em "Import single project").
   Devem aparecer `client` (Vite) em `/` e `server` (Express) em `/api`.
3. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `AI_PROVIDER` | `reapi` |
   | `REAPI_API_KEY` | sua chave do reAPI |
   | `REAPI_MODEL` | `gpt-image-2` |
   | `INPUT_HOST` | `imgbb` |
   | `IMGBB_API_KEY` | sua chave do ImgBB |
   | `RESULT_STORE` | `imgbb` |
   | `DAILY_LIMIT_PER_IP` | `10` |
   | `GLOBAL_DAILY_LIMIT` | `100` |

4. **Deploy.** Depois abra `https://SEU-PROJETO.vercel.app/api/health`: deve mostrar `"configured": true`.
   Abra `https://SEU-PROJETO.vercel.app` e teste.

Mudou alguma variável depois? Vá em *Deployments → ⋯ → Redeploy*: variáveis só valem a partir do próximo deploy.

> Alternativa: dois projetos separados (Root Directory `server` e `client`). Nesse caso defina
> `VITE_API_URL` no site e `CORS_ORIGINS` na API com a URL do outro.

### Observações da Vercel

- **Tempo:** cada geração pode durar até 300 s no plano Hobby; `GENERATION_TIMEOUT_MS` padrão (240 s) já cabe.
- **Limites de uso:** as cotas por IP ficam na memória de cada instância. Na Vercel elas são aproximadas,
  porque podem existir várias instâncias. `GLOBAL_DAILY_LIMIT` continua ajudando a conter gastos; para um
  controle exato, troque `middleware/quota.js` por Redis (ex.: Upstash).
- **Logs:** veja as linhas `[reAPI]`, `[ImgBB]` e erros em *Project → Logs*.
- **Plano Hobby:** é gratuito, mas os termos da Vercel o limitam a uso pessoal/não comercial.
  Para cobrar pelo site, use o plano Pro.

---

## Problemas comuns no Windows

| Erro | Solução |
|---|---|
| `EBUSY` / `EPERM` no `npm install` | Feche VS Code, outros terminais e o `npm run dev`; apague as pastas `node_modules` e rode `npm install` de novo. Se continuar, pause o antivírus ou mova o projeto para `C:\` |
| `'concurrently' não é reconhecido` | O `npm install` não terminou. Resolva o erro de instalação primeiro |
| `cloudflared não é reconhecido` logo após o `winget install` | Feche e abra o PowerShell de novo (ele só lê o PATH ao abrir) |
| Site mostra "IA não configurada" | Leia a mensagem: ela diz qual variável falta no `server/.env` |

## Estrutura

```
foto-estilo-gta/
├── package.json            # scripts da raiz (dev, build, start, check)
├── client/                 # React + Vite
│   ├── index.html
│   ├── vite.config.js      # proxy /api → backend
│   └── src/
│       ├── App.jsx         # estado, upload, geração, galeria
│       ├── components/     # Header, Uploader, Options, GenerateButton,
│       │                   # HeroVisual, SceneArt, Gallery, Lightbox, ...
│       ├── lib/api.js      # cliente HTTP
│       ├── lib/validation.js
│       └── styles/global.css
└── server/                 # Node + Express
    ├── .env.example
    └── src/
        ├── index.js              # app, segurança, CORS, rate limit
        ├── config.js             # leitura das variáveis de ambiente
        ├── routes/api.js         # rotas /api/*
        ├── services/
        │   ├── imageProvider.js  # escolhe o provedor (AI_PROVIDER)
        │   ├── providers/
        │   │   ├── reapi.js      # reAPI: cria tarefa, acompanha, baixa o PNG
        │   │   └── openai.js     # OpenAI Images API (/v1/images/edits)
        │   ├── inputHost.js      # link temporário da foto (só em memória)
        │   ├── promptBuilder.js  # cenários, estilos, formatos e prompt
        │   └── storage.js        # resultados com expiração automática
        ├── middleware/           # upload, cotas, erros
        └── scripts/checkConfig.js
```

## API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Status, se a IA está configurada, limites e opções |
| `GET` | `/api/quota` | Gerações restantes hoje para o IP |
| `POST` | `/api/generate` | `multipart/form-data`: `photo` (arquivo), `scenario`, `style`, `format` |
| `GET` | `/api/gallery` | Imagens geradas pelo navegador (header `X-Client-Id`) |
| `GET` | `/api/images/:id` | Imagem gerada (`?download=1` força o download) |
| `DELETE` | `/api/images/:id` | Apaga uma imagem do próprio navegador |
| `GET` | `/api/inputs/:token` | Foto temporária para o reAPI baixar (expira ao fim da geração) |

Erros sempre vêm como `{ "error": { "code": "...", "message": "..." } }`, por exemplo `AI_NOT_CONFIGURED`, `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`, `DAILY_LIMIT_REACHED`, `CONTENT_BLOCKED`, `AI_TIMEOUT`, `AI_NO_CREDITS`.

## Segurança e privacidade

- Chaves de API apenas no backend, via variáveis de ambiente.
- A foto enviada nunca é gravada no disco do servidor. Com `INPUT_HOST=self`, fica só na memória, num link com token aleatório de 256 bits que some ao fim da geração. Com `INPUT_HOST=imgbb`, é enviada ao ImgBB com expiração automática (padrão 10 min).
- Validação dupla: tipo/tamanho/dimensão no navegador e **assinatura binária real** (JPG/PNG/WEBP) no servidor.
- Limites: por IP/dia, teto global, uma geração por vez por IP e rate limit geral. Se a IA falhar, o crédito volta para o usuário.
- Helmet (CSP e cabeçalhos de segurança) e CORS restrito.
- O prompt instrui a IA a **não incluir logos, títulos ou marcas**.

> As cotas ficam em memória e zeram ao reiniciar o servidor. Para rodar várias instâncias, troque por Redis ou banco.

## Custos

Cada geração consome créditos do provedor. No reAPI, falhas e fotos bloqueadas pela moderação normalmente não são cobradas (o backend registra no log quantos créditos cada imagem custou). `gpt-image-2` em `1k` é a opção mais barata; `2k`/`4k` custam mais e demoram mais. Ajuste `GLOBAL_DAILY_LIMIT` para controlar o gasto diário.

## Aviso de marca

"GTA" e "Grand Theft Auto" são marcas da Take-Two Interactive / Rockstar Games. O site usa o termo apenas para descrever o estilo artístico, não usa logos oficiais e exibe um aviso de não afiliação no rodapé. Para uso comercial, avalie com cuidado o uso do nome nos textos.
