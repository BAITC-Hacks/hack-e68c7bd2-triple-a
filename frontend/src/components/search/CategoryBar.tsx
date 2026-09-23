import { Icon, categoryIcon } from '../ui/Icon';
const popular = ['Фотограф', 'Ведущий', 'Флорист', 'Банкетный зал'];
export function CategoryBar({ selected, onSelect, disabled }: { selected: string; disabled: boolean; onSelect: (value: string) => void }) {
  return <div className="category-bar" aria-label="Популярные категории"><span className="category-bar-label">Кого пригласим?</span><div className="category-buttons">{popular.map(category => <button type="button" key={category} className="category-pill" aria-pressed={selected === category} disabled={disabled} onClick={() => onSelect(category)}><Icon name={categoryIcon(category)} />{category}<span aria-hidden="true">↗</span></button>)}<a className="all-categories" href="#category">Все категории <span aria-hidden="true">→</span></a></div></div>;
}
