import { BrandLogo } from '../ui/BrandLogo';

export function Hero() {
  return <section className="hero" aria-labelledby="page-title">
    <div className="hero-content">
      <p className="eyebrow">Мероприятие начинается с людей</p>
      <h1 id="page-title">Найдите тех,<br />кто подойдёт</h1>
      <p className="hero-description">Подберём до трёх подрядчиков под ваши условия и объясним выбор.</p>
    </div>
    <BrandLogo symbol />
  </section>;
}
