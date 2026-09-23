import type { Contractor } from '../../types/search';
import { formatMoney } from '../../utils/format';

export function ContractorCard({ contractor }: { contractor: Contractor }) {
  const initials = contractor.name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0] ?? '').join('').toLocaleUpperCase('ru-RU');

  return (
    <article className="contractor-card">
      <div className="card-avatar" aria-hidden="true">{initials}</div>
      <h3>{contractor.name}</h3>
      <p className="card-meta">{contractor.category} · {contractor.city}</p>
      <p className="card-price"><span>от </span>{formatMoney(contractor.price_from_kzt)}</p>
      <div className="card-reason"><span className="reason-label">Почему подходит</span><p className="card-explanation">{contractor.explanation}</p></div>
      {contractor.synthetic && <p className="synthetic-note">синтетический профиль для демо</p>}
    </article>
  );
}
