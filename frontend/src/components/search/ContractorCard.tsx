import type { Contractor } from '../../types/search';
import { formatMoney } from '../../utils/format';

export function ContractorCard({ contractor, rank }: { contractor: Contractor; rank: number }) {
  return <article className="contractor-card">
    <div className="card-heading"><span className="recommendation-number" aria-label={`Рекомендация ${rank}`}>{String(rank).padStart(2, '0')}</span><h3>{contractor.name}</h3></div>
    <p className="card-meta">{contractor.category} · {contractor.city}</p>
    <div className="card-reason"><span className="reason-label">Почему подходит</span><p className="card-explanation">{contractor.explanation}</p></div>
    {contractor.synthetic && <p className="synthetic-note">синтетический профиль для демо</p>}
    <div className="card-bottom"><p className="card-price"><span>от </span>{formatMoney(contractor.price_from_kzt)}</p><p className="price-note">по данным каталога</p></div>
  </article>;
}
