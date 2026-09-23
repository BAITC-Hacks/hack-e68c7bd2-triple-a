import { EVENT_TYPES, LANGUAGES } from '../../config/search';
import type { SearchRequest } from '../../types/search';
import { formatEventDate, formatMoney } from '../../utils/format';

export function SearchSummary({ request }: { request: SearchRequest }) {
  const values = [request.city, formatEventDate(request.event_date), EVENT_TYPES.find(option => option.value === request.event_type)?.label ?? request.event_type, request.category, `до ${formatMoney(request.budget_kzt)}`];
  if (request.duration_hours !== null) values.push(`${request.duration_hours} ч`);
  if (request.language) values.push(LANGUAGES.find(option => option.value === request.language)?.label ?? request.language);

  return <div className="request-summary" aria-label="Параметры текущей подборки">{values.map((value, index) => <span className="summary-chip" key={`${index}-${value}`}>{value}</span>)}</div>;
}
