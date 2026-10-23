import { useEffect, useRef } from 'react';
import { Download, Trash2, X } from 'lucide-react';
import { assetUrl } from '../lib/api.js';
import { downloadImage } from '../lib/download.js';

export default function Lightbox({ image, labels, onClose, onDelete }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!image) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [image, onClose]);

  if (!image) return null;

  const created = new Date(image.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Imagem gerada" onClick={onClose}>
      <div className="lightbox__panel" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className="icon-btn lightbox__close" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>
        <img src={assetUrl(image.url)} alt="Personagem gerado pela IA" />
        <div className="lightbox__bar">
          <div className="lightbox__meta">
            <strong>{labels.scenarios[image.scenario] ?? 'Personagem'}</strong>
            <span>
              {labels.styles[image.style] ?? ''} · {labels.formats[image.format] ?? ''} · {created}
            </span>
          </div>
          <div className="lightbox__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(image)}>
              <Trash2 size={16} /> Remover
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => downloadImage(image)}>
              <Download size={16} /> Baixar PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
