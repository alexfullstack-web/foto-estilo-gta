import { AlertTriangle, CircleAlert, CircleCheck, X } from 'lucide-react';

const ICONS = { error: CircleAlert, warning: AlertTriangle, success: CircleCheck };

export default function Notice({ type = 'error', title, children, onClose }) {
  const Icon = ICONS[type];
  return (
    <div className={`notice notice--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={20} className="notice__icon" />
      <div className="notice__body">
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button type="button" className="notice__close" onClick={onClose} aria-label="Fechar aviso">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
