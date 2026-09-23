import { useEffect, useRef, useState } from 'react';
import { useSectionNavigation } from '../../hooks/useSectionNavigation';
import { Icon } from '../ui/Icon';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { activeSection, setActiveSection } = useSectionNavigation();
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnHistory = () => setMenuOpen(false);
    const media = window.matchMedia('(min-width: 781px)');
    const closeOnDesktop = () => { if (media.matches) setMenuOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('hashchange', closeOnHistory);
    media.addEventListener('change', closeOnDesktop);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('hashchange', closeOnHistory);
      media.removeEventListener('change', closeOnDesktop);
    };
  }, [menuOpen]);

  return (
    <header className="site-header" ref={headerRef}>
      <a className="brand" href="#top" aria-label="Круг — главная" onClick={() => { setMenuOpen(false); setActiveSection('search'); }}>
        <span className="brand-mark" aria-hidden="true" /><span className="brand-name">круг</span>
        <span className="brand-description">Люди, которые создают<br />ваше событие</span>
      </a>
      <button className="menu-toggle" ref={menuButtonRef} type="button" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(open => !open)}>
        <Icon name={menuOpen ? 'close' : 'menu'} />
      </button>
      <nav className={`header-nav${menuOpen ? ' is-open' : ''}`} id="main-navigation" aria-label="Основная навигация">
        <a className={`nav-link${activeSection === 'search' ? ' is-active' : ''}`} href="#search" aria-current={activeSection === 'search' ? 'location' : undefined} onClick={() => { setActiveSection('search'); setMenuOpen(false); }}>Подобрать подрядчика</a>
        <a className={`nav-link${activeSection === 'how-it-works' ? ' is-active' : ''}`} href="#how-it-works" aria-current={activeSection === 'how-it-works' ? 'location' : undefined} onClick={() => { setActiveSection('how-it-works'); setMenuOpen(false); }}>Как это работает</a>
      </nav>
    </header>
  );
}
