import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

const STEPS = [
  'Enviando sua foto…',
  'Analisando traços do rosto…',
  'Montando o cenário…',
  'Pintando contornos e sombras…',
  'Aplicando cores neon…',
  'Finalizando os detalhes…',
];

export default function GenerateButton({ loading, disabled, onClick, label = 'Gerar imagem' }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return undefined;
    }
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const step = STEPS[Math.min(STEPS.length - 1, Math.floor(elapsed / 8))];

  return (
    <div className="generate">
      <button
        type="button"
        className={`btn btn--primary btn--block btn--lg ${loading ? 'is-loading' : ''}`}
        onClick={onClick}
        disabled={disabled || loading}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <span className="spinner" aria-hidden />
            <span>{step}</span>
            <span className="generate__time">{elapsed}s</span>
          </>
        ) : (
          <>
            <Sparkles size={18} /> {label}
          </>
        )}
      </button>
      {loading && (
        <div className="progress" aria-hidden>
          <span />
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {loading ? `Gerando imagem: ${step}` : ''}
      </p>
    </div>
  );
}
