import { useRef, useState } from 'react';
import { CloudUpload, ImageIcon, RefreshCw, Trash2 } from 'lucide-react';
import { ACCEPT_ATTR } from '../lib/validation.js';

export default function Uploader({ file, preview, onSelect, onClear, disabled, maxMb }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const open = () => !disabled && inputRef.current?.click();

  const handleFiles = (files) => {
    if (disabled || !files?.length) return;
    if (files.length > 1) {
      onSelect(null, 'Envie apenas uma foto por vez.');
      return;
    }
    onSelect(files[0]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      id="enviar"
      className={`dropzone ${dragging ? 'dropzone--drag' : ''} ${file ? 'dropzone--filled' : ''} ${disabled ? 'dropzone--disabled' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {file && preview ? (
        <div className="dropzone__file">
          <img src={preview} alt="Prévia da foto enviada" className="dropzone__thumb" />
          <div className="dropzone__info">
            <strong title={file.name}>{file.name}</strong>
            <span>{(file.size / 1024 / 1024).toFixed(2)} MB · pronta para gerar</span>
            <div className="dropzone__actions">
              <button type="button" className="link-btn" onClick={open} disabled={disabled}>
                <RefreshCw size={14} /> Trocar
              </button>
              <button type="button" className="link-btn link-btn--danger" onClick={onClear} disabled={disabled}>
                <Trash2 size={14} /> Remover
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" className="dropzone__empty" onClick={open} disabled={disabled}>
          <span className="dropzone__icon">{dragging ? <ImageIcon size={30} /> : <CloudUpload size={30} />}</span>
          <span className="dropzone__text">
            <strong>{dragging ? 'Solte a foto aqui' : 'Clique para enviar sua foto'}</strong>
            <span>ou arraste e solte aqui</span>
          </span>
        </button>
      )}

      <p className="dropzone__hint">
        Formatos aceitos: JPG, PNG, WEBP <span aria-hidden>•</span> Tamanho máx.: {maxMb}MB
      </p>
    </div>
  );
}
