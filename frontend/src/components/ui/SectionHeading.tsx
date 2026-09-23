import type { ReactNode } from 'react';

type SectionHeadingProps = { id: string; step: string; children: ReactNode };

export function SectionHeading({ id, step, children }: SectionHeadingProps) {
  return <div className="section-heading"><span className="step" aria-hidden="true">{step}</span><h2 id={id}>{children}</h2></div>;
}
