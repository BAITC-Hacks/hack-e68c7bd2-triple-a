import logoLight from '../../assets/brand/logo-light.svg';
import logoDark from '../../assets/brand/logo-dark.svg';
import iconLight from '../../assets/brand/icon-light.svg';
import iconDark from '../../assets/brand/icon-dark.svg';

export function BrandLogo({ symbol = false }: { symbol?: boolean }) {
  return <span className={symbol ? 'hero-symbol' : 'brand-logo'} aria-hidden="true">
    <img className="theme-light" src={symbol ? iconLight : logoLight} alt="" width={symbol ? 96 : 306} height="96" />
    <img className="theme-dark" src={symbol ? iconDark : logoDark} alt="" width={symbol ? 96 : 306} height="96" />
  </span>;
}
