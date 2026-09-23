import { useEffect, useState } from 'react';

export type SectionId = 'search' | 'how-it-works';

function sectionFromHash(): SectionId {
  return window.location.hash === '#how-it-works' ? 'how-it-works' : 'search';
}

export function useSectionNavigation() {
  const [activeSection, setActiveSection] = useState<SectionId>(sectionFromHash);

  useEffect(() => {
    const handleHistory = () => setActiveSection(sectionFromHash());
    window.addEventListener('hashchange', handleHistory);
    window.addEventListener('popstate', handleHistory);
    return () => {
      window.removeEventListener('hashchange', handleHistory);
      window.removeEventListener('popstate', handleHistory);
    };
  }, []);

  return { activeSection, setActiveSection };
}
