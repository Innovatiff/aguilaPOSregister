import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  size?: 'md' | 'wide' | 'xl';
  onClose?: () => void;
  children: ReactNode;
}

export default function ModalShell({ title, subtitle, size = 'md', onClose, children }: Props) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size === 'wide' ? 'modal--wide' : size === 'xl' ? 'modal--xl' : ''}`} role="dialog" aria-modal="true">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <h2 className="modal__title">{title}</h2>
            {subtitle && <p className="modal__subtitle">{subtitle}</p>}
          </div>
          {onClose && (
            <button className="key key--sm key--ghost" onClick={onClose} aria-label="Close" style={{ minHeight: 36 }}>
              <X size={18} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
