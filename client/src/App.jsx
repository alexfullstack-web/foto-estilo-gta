import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Zap, RotateCcw } from 'lucide-react';
import Header from './components/Header.jsx';
import Uploader from './components/Uploader.jsx';
import Options from './components/Options.jsx';
import GenerateButton from './components/GenerateButton.jsx';
import HeroVisual from './components/HeroVisual.jsx';
import Notice from './components/Notice.jsx';
import Lightbox from './components/Lightbox.jsx';
import { ResultsGallery, ScenarioShowcase } from './components/Gallery.jsx';
import { WhyUs, HowItWorks, Faq, Footer } from './components/InfoSections.jsx';
import { api } from './lib/api.js';
import { validatePhoto, readImageDimensions, MAX_RAW_MB } from './lib/validation.js';
import { compressPhoto } from './lib/compress.js';
import { loadGallery, saveGallery } from './lib/gallery.js';

// Usado só enquanto o backend não responde (mesmos ids do servidor)
const FALLBACK_OPTIONS = {
  scenarios: [
    { id: 'sunset-hills', label: 'Pôr do sol na metrópole', description: 'Palmeiras, colinas e céu roxo-alaranjado' },
    { id: 'neon-beach', label: 'Praia neon anos 80', description: 'Avenida à beira-mar com neon rosa e ciano' },
    { id: 'hood-90s', label: 'Bairro anos 90', description: 'Rua ensolarada da costa oeste com lowrider' },
    { id: 'downtown', label: 'Centro financeiro', description: 'Arranha-céus de vidro sob céu azul' },
    { id: 'desert-road', label: 'Estrada no deserto', description: 'Rodovia, mesas rochosas e muscle car' },
  ],
  styles: [
    { id: 'cover', label: 'Capa clássica' },
    { id: 'loading', label: 'Tela de carregamento' },
    { id: 'noir', label: 'Noturno' },
  ],
  formats: [
    { id: 'portrait', label: 'Retrato' },
    { id: 'square', label: 'Quadrado' },
    { id: 'landscape', label: 'Paisagem' },
  ],
  defaults: { scenario: 'sunset-hills', style: 'cover', format: 'portrait' },
};

const MIN_SIDE = 256;

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('fotogta.theme') || 'dark';
    } catch {
      return 'dark';
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('fotogta.theme', theme);
    } catch {
      /* armazenamento indisponível */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const [quota, setQuota] = useState(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [choice, setChoice] = useState(FALLBACK_OPTIONS.defaults);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [gallery, setGallery] = useState(loadGallery);
  const [lightbox, setLightbox] = useState(null);

  const heroRef = useRef(null);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const options = health?.options ?? FALLBACK_OPTIONS;
  const maxMb = health?.limits?.maxUploadMb ?? 10;
  const retentionHours = health?.limits?.retentionHours ?? 24;
  const aiConfigured = health?.ai?.configured === true;

  const labels = useMemo(() => {
    const map = (list) => Object.fromEntries(list.map((o) => [o.id, o.label]));
    return { scenarios: map(options.scenarios), styles: map(options.styles), formats: map(options.formats) };
  }, [options]);

  // ── Carregamento inicial ──────────────────────────────────
  const loadStatus = useCallback(async () => {
    try {
      const [h, q] = await Promise.all([api.health(), api.quota()]);
      setHealth(h);
      setQuota(q);
      setHealthError(null);
    } catch (err) {
      setHealthError(err.message);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Mantém "Seus resultados" salvo no navegador
  useEffect(() => saveGallery(gallery), [gallery]);

  // Libera a URL da prévia quando trocar/remover a foto
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  // ── Seleção de arquivo ────────────────────────────────────
  const handleSelect = async (selected, message) => {
    setError(null);
    if (!selected) {
      if (message) setError({ title: 'Arquivo inválido', message });
      return;
    }
    const problem = validatePhoto(selected, MAX_RAW_MB);
    if (problem) {
      setError({ title: 'Arquivo inválido', message: problem });
      return;
    }
    try {
      const { width, height, url } = await readImageDimensions(selected);
      if (Math.min(width, height) < MIN_SIDE) {
        URL.revokeObjectURL(url);
        setError({ title: 'Foto muito pequena', message: `Use uma imagem com pelo menos ${MIN_SIDE}px no menor lado (a sua tem ${width}×${height}).` });
        return;
      }
      const ready = await compressPhoto(selected, { width, height });
      if (ready.size > maxMb * 1024 * 1024) {
        URL.revokeObjectURL(url);
        setError({ title: 'Foto muito grande', message: `Mesmo comprimida, a foto passou de ${maxMb} MB. Tente outra imagem.` });
        return;
      }
      setFile(ready);
      setPreview(url);
      setResult(null);
    } catch (err) {
      setError({ title: 'Arquivo inválido', message: err.message });
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
  };

  // ── Geração ───────────────────────────────────────────────
  const generate = async () => {
    if (!file || loading) return;
    setError(null);
    setLoading(true);
    if (window.matchMedia('(max-width: 900px)').matches) {
      heroRef.current?.querySelector('.hero-visual')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    try {
      const data = await api.generate({ file, ...choice });
      setResult(data.image);
      setQuota(data.quota);
      setGallery((g) => [data.image, ...g.filter((i) => i.id !== data.image.id)]);
    } catch (err) {
      const titles = {
        AI_NOT_CONFIGURED: 'IA não configurada',
        DAILY_LIMIT_REACHED: 'Limite diário atingido',
        GLOBAL_LIMIT_REACHED: 'Limite do site atingido',
        CONTENT_BLOCKED: 'Foto recusada pela IA',
        NETWORK_ERROR: 'Sem conexão com o servidor',
        AI_TIMEOUT: 'Tempo esgotado',
      };
      setError({ title: titles[err.code] ?? 'Não foi possível gerar a imagem', message: err.message });
      if (err.code === 'AI_NOT_CONFIGURED') setHealth((h) => (h ? { ...h, ai: { ...h.ai, configured: false } } : h));
      api.quota().then(setQuota).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (img) => {
    try {
      if (!img.remote) await api.remove(img.id).catch(() => {});
      setGallery((g) => g.filter((i) => i.id !== img.id));
      if (result?.id === img.id) setResult(null);
      setLightbox(null);
    } catch (err) {
      setError({ title: 'Não foi possível apagar', message: err.message });
    }
  };

  const pickScenario = (id) => {
    setChoice((c) => ({ ...c, scenario: id }));
    goToUpload();
  };

  const goToUpload = () => {
    document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth' });
  };

  const noQuota = quota && quota.remaining <= 0;
  const disabledReason = !health
    ? null
    : !aiConfigured
      ? 'A IA ainda não foi configurada no servidor.'
      : noQuota
        ? 'Você usou todas as gerações de hoje.'
        : !file
          ? 'Envie uma foto para começar.'
          : null;

  return (
    <>
      <Header
        scenarios={options.scenarios}
        onPickScenario={pickScenario}
        theme={theme}
        onToggleTheme={toggleTheme}
        quota={aiConfigured ? quota : null}
        onStart={goToUpload}
      />

      <main>
        <section className="hero" id="inicio" ref={heroRef}>
          <div className="container hero__grid">
            <div className="hero__copy">
              <span className="badge">
                <Zap size={14} /> IA • Geração de imagens
              </span>
              <h1>
                Transforme sua foto em um personagem <span className="neon">estilo GTA</span>
              </h1>
              <p className="lead">
                Envie sua foto e deixe a IA criar uma arte no visual clássico das capas e telas de carregamento.
                Escolha o cenário, o estilo e veja você como protagonista de um jogo de ação urbano.
              </p>

              {healthError && (
                <Notice type="error" title="Servidor indisponível">
                  {healthError}{' '}
                  <button type="button" className="link-btn" onClick={loadStatus}>
                    <RotateCcw size={14} /> Tentar novamente
                  </button>
                </Notice>
              )}

              {health && !aiConfigured && (
                <Notice type="warning" title="IA não configurada">
                  O servidor está no ar, mas a geração de imagens ({health.ai.provider}) ainda não foi configurada.{' '}
                  {health.ai.problem}
                </Notice>
              )}

              <Uploader
                file={file}
                preview={preview}
                onSelect={handleSelect}
                onClear={clearFile}
                disabled={loading}
                maxMb={MAX_RAW_MB}
              />

              <Options
                options={options}
                value={choice}
                onChange={(patch) => setChoice((c) => ({ ...c, ...patch }))}
                disabled={loading}
              />

              <GenerateButton
                loading={loading}
                disabled={Boolean(disabledReason) || !health}
                onClick={generate}
                label={result ? 'Gerar outra versão' : 'Gerar imagem'}
              />
              {disabledReason && !loading && <p className="hint">{disabledReason}</p>}

              {error && (
                <Notice type="error" title={error.title} onClose={() => setError(null)}>
                  {error.message}
                </Notice>
              )}
            </div>

            <HeroVisual
              scenario={choice.scenario}
              format={choice.format}
              preview={preview}
              result={result}
              loading={loading}
              onOpen={setLightbox}
            />
          </div>
        </section>

        <section className="section section--alt">
          <div className="container lower__grid">
            <div className="lower__main">
              <ResultsGallery images={gallery} labels={labels} onOpen={setLightbox} retentionHours={retentionHours} />
              <ScenarioShowcase scenarios={options.scenarios} active={choice.scenario} onPick={pickScenario} />
            </div>
            <WhyUs retentionHours={retentionHours} />
          </div>
        </section>

        <HowItWorks />
        <Faq dailyLimit={health?.limits?.dailyPerIp ?? 10} maxMb={MAX_RAW_MB} />
      </main>

      <Footer onStart={goToUpload} />

      <Lightbox image={lightbox} labels={labels} onClose={closeLightbox} onDelete={deleteImage} />
    </>
  );
}
