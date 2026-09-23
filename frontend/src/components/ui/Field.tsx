import type { ReactNode } from 'react';

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
};

export function Field({ id, label, hint, error, wide = false, children }: FieldProps) {
  return (
    <div className={`field${wide ? ' field-wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
