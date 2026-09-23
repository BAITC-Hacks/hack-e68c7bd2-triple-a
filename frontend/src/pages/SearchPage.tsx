import { useEffect, useRef, useState } from 'react';
import { Hero } from '../components/search/Hero';
import { HowItWorks } from '../components/search/HowItWorks';
import { SearchForm } from '../components/search/SearchForm';
import { SearchResults } from '../components/search/SearchResults';
import { useSearch } from '../hooks/useSearch';
import { useSearchDraft } from '../hooks/useSearchDraft';
import { resultCountLabel } from '../utils/format';

export function SearchPage() {
  const { values, setField, resetDraft, storageAvailable } = useSearchDraft();
  const { state, search, cancel, reset } = useSearch();
  const formRef = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState('');

  function editParameters() {
    formRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
    const city = formRef.current?.elements.namedItem('city');
    if (city instanceof HTMLElement) city.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (state.status === 'loading') setAnnouncement('Ищем подходящих исполнителей.');
    if (state.status === 'success') setAnnouncement(state.response.status === 'ok' ? `Подборка готова: ${resultCountLabel(state.response.results.length)}.` : state.response.message || 'Подходящих вариантов не найдено.');
    if (state.status === 'error') setAnnouncement('Не удалось завершить поиск.');
    if (state.status !== 'success' && state.status !== 'error') return;
    resultsRef.current?.focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 780px)').matches) resultsRef.current?.closest('section')?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [state]);

  return (
    <main>
      <Hero />
      <div className="workspace" id="search" tabIndex={-1}>
        <SearchForm values={values} setField={setField} loading={state.status === 'loading'} storageAvailable={storageAvailable} formRef={formRef} onSubmit={request => { void search(request); }} onReset={() => { resetDraft(); reset(); setAnnouncement('Параметры и результаты поиска сброшены.'); }} />
        <SearchResults state={state} bodyRef={resultsRef} onEdit={editParameters} onRetry={() => { if (state.request) void search(state.request); }} onCancel={() => { cancel(); setAnnouncement('Поиск отменён.'); requestAnimationFrame(editParameters); }} />
      </div>
      <HowItWorks />
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    </main>
  );
}
