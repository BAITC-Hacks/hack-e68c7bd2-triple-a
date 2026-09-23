import type { SearchRequest } from '../../types/search';
import { Icon } from '../ui/Icon';
const base: SearchRequest = { city: 'Алматы', event_date: '2026-11-14', event_type: 'свадьба', category: 'Фотограф', budget_kzt: 300000, duration_hours: null, language: null };
export const DEMO_PRESETS = [
  { label: 'Свадьба в Алматы', caption: 'Фотограф · до 300 000 ₸', request: base },
  { label: 'Редкая категория', caption: 'Флорист · до 350 000 ₸', request: { ...base, category: 'Флорист', budget_kzt: 350000 } },
  { label: 'Без совпадений', caption: 'Проверить пустую выдачу', request: { ...base, budget_kzt: 1000 } },
];
export function DemoPresets({ onChoose, disabled }: { onChoose: (request: SearchRequest) => void; disabled: boolean }) {
  return <div className="demo-presets"><p className="preset-heading"><Icon name="sparkles"/>Попробуйте на примере <span>Демо-сценарии</span></p><div className="preset-grid">{DEMO_PRESETS.map(preset => <button type="button" className="preset-button" key={preset.label} onClick={() => onChoose(preset.request)} disabled={disabled}><strong>{preset.label}<span aria-hidden="true">↗</span></strong><span>{preset.caption}</span></button>)}</div></div>;
}
