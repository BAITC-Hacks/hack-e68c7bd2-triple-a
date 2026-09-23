import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

type InfoDialogProps = { trigger: string; title: string; children: ReactNode; className?: string; onOpen?: () => void; onDismiss?: () => void };

export function InfoDialog({ trigger, title, children, className = 'footer-link', onOpen, onDismiss }: InfoDialogProps) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  return <>
    <button type="button" className={className} onClick={() => { onOpen?.(); setOpen(true); }}>{trigger}</button>
    {createPortal(<dialog className="help-dialog" ref={dialog} aria-labelledby={titleId} onCancel={() => setOpen(false)} onClose={() => { setOpen(false); onDismiss?.(); }} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="dialog-content">
        <div className="dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="dialog-close" aria-label="Закрыть окно" onClick={() => setOpen(false)}><Icon name="close" /></button></div>
        {children}
      </div>
    </dialog>, document.body)}
  </>;
}
