import { useEffect, useRef, type ReactNode } from 'react';
import { STATUS } from '../lib/fish';
import type { Status } from '../types';

export function StatusTag({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <span className="status" style={{ color: s.color }}>
      <span className="status-dot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

/** 弹窗：Esc 和点遮罩都能关；打开时把焦点放进去，关闭后还给原来的按钮 */
export function Modal({ title, hint, onClose, children, footer, width = 760 }: {
  title: string; hint?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>('textarea, input, select');
    (first || box.current)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} ref={box} tabIndex={-1} style={{ width }}>
        <div className="dialog-hd">
          <div className="stack6">
            <h2>{title}</h2>
            {hint && <p className="hint">{hint}</p>}
          </div>
          <button type="button" className="x" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="dialog-bd">{children}</div>
        {footer && <div className="dialog-ft">{footer}</div>}
      </div>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p role="alert" className="err">{children}</p> : null;
}
