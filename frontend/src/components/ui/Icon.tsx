type IconProps = { name: 'search' | 'document' | 'shield' | 'menu' | 'close' };

export function Icon({ name }: IconProps) {
  if (name === 'document') {
    return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="5" y="5" width="17" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" /><path d="M10 11h7m-7 5h5m8 0 2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (name === 'shield') {
    return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m10 2 7 3v5c0 4-7 8-7 8s-7-4-7-8V5l7-3Z" stroke="currentColor" strokeWidth="1.2" /><path d="m6.8 9.7 2.1 2.1 4.4-4.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (name === 'search') {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
  }
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={name === 'menu' ? 'M4 6h16M4 12h16M4 18h16' : 'm6 6 12 12M6 18 18 6'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}
