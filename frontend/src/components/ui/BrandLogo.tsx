export function BrandLogo({ symbol = false }: { symbol?: boolean }) {
  return <span className={symbol ? 'hero-symbol' : 'brand-logo'} aria-hidden="true">
    <svg className="brand-mark" viewBox="0 0 40 40" fill="none"><circle cx="9" cy="8" r="3" fill="currentColor"/><circle cx="20" cy="5" r="3" fill="currentColor"/><circle cx="31" cy="8" r="3" fill="currentColor"/><path d="M9 16v14h22V16M20 13v17" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    {!symbol && <span className="brand-word">shabyt<span className="brand-dot">.</span></span>}
  </span>;
}
