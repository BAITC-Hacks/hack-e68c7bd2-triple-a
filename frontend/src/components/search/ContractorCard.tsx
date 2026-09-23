import type { Contractor } from '../../types/search';
import { formatMoney } from '../../utils/format';
import { Icon, categoryIcon } from '../ui/Icon';

export function ContractorCard({ contractor, rank }: { contractor: Contractor; rank: number }) {
  return <article className={`contractor-card rank-${rank}`}>
    <div className="contractor-topline"><span className="card-category"><Icon name={categoryIcon(contractor.category)}/>{contractor.category}</span><span className="recommendation-number" aria-label={`Рекомендация ${rank}`}>Вариант {String(rank).padStart(2, '0')}</span></div>
    <div className="card-heading"><h3>{contractor.name}</h3><p className="card-price"><span>от </span>{formatMoney(contractor.price_from_kzt)}</p></div>
    <div className="card-meta-row"><p className="card-meta"><Icon name="pin"/>{contractor.city}</p><span className="price-note">{contractor.price_imputed ? 'цена задана для датасета' : 'по данным каталога'}</span></div>
    <div className="card-reason"><span className="reason-label"><Icon name="sparkles"/>Почему подходит <span>{contractor.explanation_source === 'openai' ? 'AI-объяснение' : contractor.explanation_source === 'fallback' ? 'Резервное объяснение' : 'По данным профиля'}</span></span><p className="card-explanation">{contractor.explanation}</p></div>
    <div className="card-bottom">{contractor.synthetic ? <p className="synthetic-note"><span className="status-dot"/>синтетический профиль для демо</p> : <p className="profile-origin">Обезличенный профиль каталога</p>}{contractor.languages && <span className="card-language">{contractor.languages.join(' · ')}</span>}</div>
    {contractor.description && <details className="profile-details"><summary>О профиле<span aria-hidden="true">↗</span></summary><p>{contractor.description}</p>{contractor.max_hours != null && <p><strong>До {contractor.max_hours} ч на площадке.</strong></p>}{contractor.city_imputed && <p className="hint">Город проставлен при подготовке датасета.</p>}</details>}
  </article>;
}
