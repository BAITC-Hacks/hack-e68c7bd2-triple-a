import { Icon } from '../ui/Icon';
const steps = [
  { title: 'Расскажите о событии', text: 'Город, дата, формат и бюджет. А язык и длительность — по желанию.', icon: 'sliders' as const },
  { title: 'Получите короткую подборку', text: 'Исключим занятых и неподходящих. Оставим до трёх вариантов из каталога.', icon: 'search' as const },
  { title: 'Сравните и выберите', text: 'У каждой карточки — свои причины. Без общих обещаний и случайного порядка.', icon: 'sparkles' as const },
];
export function HowItWorks() {
  return <section className="how-it-works" id="how-it-works" aria-labelledby="how-title" tabIndex={-1}><div className="how-heading"><p className="eyebrow">ПРОСТО, КАК ХОРОШАЯ ИДЕЯ</p><h2 id="how-title">Меньше поиска.<br /><span>Больше ясности.</span></h2><p>Вы планируете важное.<br />Мы помогаем определиться с людьми.</p></div><div className="how-steps">{steps.map((step, index) => <div className="how-step" key={step.title}><div className="how-step-top"><span className="how-icon"><Icon name={step.icon}/></span><span className="how-number">0{index + 1}</span></div><h3>{step.title}</h3><p>{step.text}</p></div>)}</div></section>;
}
