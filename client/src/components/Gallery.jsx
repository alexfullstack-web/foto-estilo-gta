import { Download, Images, Sparkles } from 'lucide-react';
import SceneArt from './SceneArt.jsx';
import { assetUrl } from '../lib/api.js';
import { downloadImage } from '../lib/download.js';

export function ResultsGallery({ images, labels, onOpen, retentionHours }) {
  return (
    <div className="block" id="galeria">
      <div className="block__head">
        <h2><Images size={22} className="accent" /> Seus resultados</h2>
        <p>
          {images.length
            ? `Imagens geradas neste navegador. Ficam disponíveis por ${retentionHours}h — baixe as que quiser guardar.`
            : 'As imagens que você gerar aparecem aqui para ver e baixar.'}
        </p>
      </div>

      {images.length ? (
        <div className="thumbs">
          {images.map((img) => (
            <figure key={img.id} className="thumb">
              <button type="button" className="thumb__open" onClick={() => onOpen(img)} aria-label="Ampliar imagem">
                <img src={assetUrl(img.url)} alt={`Personagem — ${labels.scenarios[img.scenario] ?? ''}`} loading="lazy" />
              </button>
              <figcaption>
                <span>{labels.scenarios[img.scenario] ?? 'Personagem'}</span>
                <button type="button" onClick={() => downloadImage(img)} className="thumb__dl" aria-label="Baixar">
                  <Download size={15} />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="empty">
          <Sparkles size={22} />
          <span>Nenhuma imagem ainda. Envie uma foto e clique em “Gerar imagem”.</span>
        </div>
      )}
    </div>
  );
}

export function ScenarioShowcase({ scenarios, active, onPick }) {
  return (
    <div className="block">
      <div className="block__head">
        <h2><Sparkles size={22} className="accent" /> Escolha o cenário</h2>
        <p>Toque em um cenário para usá-lo na sua próxima geração.</p>
      </div>
      <div className="scenes">
        {scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`scene-card ${active === s.id ? 'scene-card--on' : ''}`}
            onClick={() => onPick(s.id)}
            aria-pressed={active === s.id}
          >
            <SceneArt scene={s.id} heli={false} />
            <span className="scene-card__label">
              <strong>{s.label}</strong>
              <small>{s.description}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
