import { useEffect, useRef, useState } from 'react';
import { Hero } from '../components/search/Hero';
import { HowItWorks } from '../components/search/HowItWorks';
import { SearchForm } from '../components/search/SearchForm';
import { SearchResults } from '../components/search/SearchResults';
import { useSearch } from '../hooks/useSearch';
import { useSearchDraft } from '../hooks/useSearchDraft';
import { resultCountLabel } from '../utils/format';
import { SEARCH_MODE } from '../config/runtime';
import { CategoryBar } from '../components/search/CategoryBar';
import { DemoPresets } from '../components/search/DemoPresets';
import type { SearchRequest, SearchFormValues } from '../types/search';

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

  function chooseDemo(request: SearchRequest) {
    const draft: SearchFormValues = { ...request, budget_kzt: String(request.budget_kzt), duration_hours: request.duration_hours === null ? '' : String(request.duration_hours), language: request.language || '' };
    (Object.keys(draft) as (keyof SearchFormValues)[]).forEach(key => setField(key, draft[key]));
    void search(request);
  }

  return (
    <main>
      <Hero />
      <CategoryBar disabled={state.status === 'loading'} selected={values.category} onSelect={category => { setField('category', category); editParameters(); }} />
      <div className="workspace-heading"><div><p className="eyebrow">ПОДБОР БЕЗ ЛИШНЕГО ШУМА</p><h2>Найдём ваших людей</h2></div><p><span className="status-dot"/>Календарь: 23 сентября — 31 декабря 2026</p></div>
      <DemoPresets onChoose={chooseDemo} disabled={state.status === 'loading'}/>

      {SEARCH_MODE === 'catalog' && <p className="demo-notice"><strong>Демонстрационный каталог.</strong> Поиск работает по обезличенным данным хакатона, без серверного ИИ. Контакты и бронирование недоступны.</p>}
      <div className="workspace" id="search" tabIndex={-1}>
        <SearchForm values={values} setField={setField} loading={state.status === 'loading'} storageAvailable={storageAvailable} formRef={formRef} onSubmit={request => { void search(request); }} onReset={() => { resetDraft(); reset(); setAnnouncement('Параметры и результаты поиска сброшены.'); }} />
        <SearchResults state={state} bodyRef={resultsRef} onEdit={editParameters} onRetry={() => { if (state.request) void search(state.request); }} onCancel={() => { cancel(); setAnnouncement('Поиск отменён.'); requestAnimationFrame(editParameters); }} />
      </div>
      <HowItWorks />
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    </main>
  );
}
