import { Download, Maximize2, User } from 'lucide-react';
import SceneArt from './SceneArt.jsx';
import { assetUrl } from '../lib/api.js';
import { downloadImage } from '../lib/download.js';

const RATIOS = { portrait: '4 / 5', square: '1 / 1', landscape: '3 / 2' };

export default function HeroVisual({ scenario, format, preview, result, loading, onOpen }) {
  const ratio = RATIOS[result?.format ?? format] ?? RATIOS.portrait;

  return (
    <div className="hero-visual">
      <div className={`hero-visual__frame ${loading ? 'is-scanning' : ''}`} style={{ '--frame-ratio': ratio }}>
        {result ? (
          <>
          <img src={assetUrl(result.url)} alt="" aria-hidden className="hero-visual__backdrop" />
          <img
            key={result.id}
            src={assetUrl(result.url)}
            alt="Personagem gerado pela IA a partir da sua foto"
            className="hero-visual__result"
          />
          </>
        ) : (
          <>
            <SceneArt scene={scenario} />
            <div className="hero-visual__placeholder">
              <span>{loading ? 'Pintando seu personagem…' : 'Seu personagem aparece aqui'}</span>
            </div>
          </>
        )}

        {loading && <div className="scanline" aria-hidden />}

        {result && !loading && (
          <div className="hero-visual__toolbar">
            <button type="button" className="glass-btn" onClick={() => onOpen(result)}>
              <Maximize2 size={16} /> Ampliar
            </button>
            <button type="button" className="glass-btn glass-btn--accent" onClick={() => downloadImage(result)}>
              <Download size={16} /> Baixar
            </button>
          </div>
        )}
      </div>

      <figure className="polaroid">
        {preview ? (
          <img src={preview} alt="Sua foto" />
        ) : (
          <div className="polaroid__empty">
            <User size={42} />
          </div>
        )}
        <figcaption>Sua foto</figcaption>
      </figure>

      <svg className="hero-visual__arrow" viewBox="0 0 100 50" aria-hidden>
        <path d="M4 12 C30 4 60 6 86 34" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M70 34 L88 37 L86 19" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
