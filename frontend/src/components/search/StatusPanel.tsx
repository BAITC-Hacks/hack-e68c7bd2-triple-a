import type { ReactNode } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { MatchIllustration } from './MatchIllustration';

type StatusPanelProps = {
  title: string;
  message: string;
  variant?: 'idle' | 'loading' | 'empty' | 'error';
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
};

export function StatusPanel({ title, message, variant = 'empty', action, children }: StatusPanelProps) {
  return (
    <div className={`empty-state ${variant}-state`} role={variant === 'error' ? 'alert' : undefined}>
      {variant === 'idle' && <MatchIllustration/>}
      <div className="state-icon" aria-hidden="true">{variant === 'idle' ? <Icon name="document" /> : variant === 'loading' ? <span className="loading-spinner" /> : variant === 'error' ? '!' : '↗'}</div>
      <h3>{title}</h3><p>{message}</p>
      {children}
      {action && <div className="state-actions"><Button variant={variant === 'loading' ? 'quiet' : 'secondary'} className={variant === 'loading' ? 'cancel-button' : 'secondary-button'} onClick={action.onClick}>{action.label}</Button></div>}
    </div>
  );
}
