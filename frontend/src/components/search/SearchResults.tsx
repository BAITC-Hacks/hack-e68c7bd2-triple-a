import type { RefObject } from 'react';
import type { SearchState } from '../../types/search';
import { resultCountLabel } from '../../utils/format';
import { Icon } from '../ui/Icon';
import { SectionHeading } from '../ui/SectionHeading';
import { ContractorCard } from './ContractorCard';
import { SearchSummary } from './SearchSummary';
import { StatusPanel } from './StatusPanel';

type SearchResultsProps = {
  state: SearchState;
  onRetry: () => void;
  onEdit: () => void;
  onCancel: () => void;
  bodyRef: RefObject<HTMLDivElement | null>;
};

export function SearchResults({ state, onRetry, onEdit, onCancel, bodyRef }: SearchResultsProps) {
  const count = state.status === 'loading' ? 'Идёт поиск' : state.status === 'error' ? 'Поиск не завершён' : state.status === 'success' ? state.response.status === 'ok' ? resultCountLabel(state.response.results.length) : 'Нет вариантов' : 'До 3 вариантов';

  return (
    <section className="results-panel" id="results-panel" aria-labelledby="results-title" aria-busy={state.status === 'loading'}>
      <div className="results-header"><SectionHeading id="results-title" step="02">Ваша подборка</SectionHeading><span className="results-count">{count}</span></div>
      {state.request && <SearchSummary request={state.request} />}
      <div className="results-body" ref={bodyRef} tabIndex={-1}>
        {state.status === 'idle' && <StatusPanel variant="idle" title="Начнём с вашего события" message="Заполните параметры события. Здесь появятся подрядчики, которые подходят под ваши планы."><div className="criteria"><span className="criterion">✓ &nbsp; В вашем бюджете</span><span className="criterion">✓ &nbsp; На вашу дату</span><span className="criterion">✓ &nbsp; Под ваш формат</span></div></StatusPanel>}
        {state.status === 'loading' && <StatusPanel variant="loading" title="Ищем подходящих исполнителей…" message="Проверяем параметры и готовим объяснение для каждого варианта." action={{ label: 'Отменить поиск', onClick: onCancel }} />}
        {state.status === 'error' && <StatusPanel variant="error" title="Не удалось завершить поиск" message={state.error} action={{ label: 'Попробовать ещё раз', onClick: onRetry }} />}
        {state.status === 'success' && state.response.status === 'ok' && <>
          {state.response.message?.trim() && <p className="result-message">{state.response.message}</p>}
          <div className="cards">{state.response.results.map(contractor => <ContractorCard key={contractor.id} contractor={contractor} />)}</div>
        </>}
        {state.status === 'success' && state.response.status !== 'ok' && <StatusPanel title={state.response.status === 'no_category' ? 'Такой категории пока нет' : 'Совпадений пока нет'} message={state.response.message?.trim() || (state.response.status === 'no_category' ? 'В этом городе в каталоге пока нет подрядчиков выбранной категории.' : 'По выбранным параметрам не найдено подходящих подрядчиков. Можно изменить условия поиска.')} action={{ label: 'Изменить параметры', onClick: onEdit }} />}
      </div>
      <div className="explanation-note"><Icon name="shield" /><p><strong>Понятно, почему подходит.</strong> В каждой карточке — объяснение на основе данных подрядчика и параметров вашего события.</p></div>
    </section>
  );
}
