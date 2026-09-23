import { Icon } from '../ui/Icon';

export function Hero() {
  return <section className="hero" aria-labelledby="page-title">
    <div className="hero-content">
      <p className="eyebrow"><span className="status-dot" />Люди, с которыми всё сложится</p>
      <h1 id="page-title">Ваше событие.<br /><span>Ваша команда.</span></h1>
      <p className="hero-description">Не сотни анкет, а до трёх подходящих подрядчиков. По вашему городу, дате и бюджету — с понятным объяснением выбора.</p>
      <div className="hero-actions"><a className="button hero-cta" href="#search">Собрать свою команду<Icon name="arrow" /></a><span className="hero-caption">Меньше поиска.<br />Больше предвкушения.</span></div>
    </div>
    <div className="hero-art" aria-hidden="true">
      <div className="art-grid" /><span className="art-label">THE ART OF COMING TOGETHER</span>
      <div className="art-flower"><i/><i/><i/><i/><i/><i/><i/><i/><span className="flower-core"><Icon name="sparkles" /></span></div>
      <div className="art-ticket ticket-one"><span className="ticket-icon"><Icon name="camera"/></span><span>Ваш момент.<br /><strong>В правильных руках.</strong></span><span className="ticket-dot"/></div>
      <div className="art-ticket ticket-two"><Icon name="check"/><span>Люди + событие = <strong>шабыт</strong></span></div>
      <div className="art-footer"><span>Создавайте поводы<br />быть вместе.</span><span className="art-arrow">↗</span></div>
    </div>
  </section>;
}
