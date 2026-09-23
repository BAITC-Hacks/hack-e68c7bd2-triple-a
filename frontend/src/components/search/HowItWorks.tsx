const steps = [
  { title: 'Расскажите о событии', text: 'Город, дата, формат и бюджет — то, что действительно важно.' },
  { title: 'Получите короткую подборку', text: 'До трёх подходящих вариантов из каталога подрядчиков.' },
  { title: 'Сравните и выберите', text: 'Конкретные причины выбора вместо общих обещаний.' },
];

export function HowItWorks() {
  return (
    <section className="how-it-works" id="how-it-works" aria-labelledby="how-title" tabIndex={-1}>
      <h2 id="how-title">Меньше поиска.<br />Больше ясности.</h2>
      {steps.map((step, index) => <div className="how-step" key={step.title}><span className="how-number" aria-hidden="true">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></div>)}
    </section>
  );
}
