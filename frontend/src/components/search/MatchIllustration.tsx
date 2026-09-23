import { Icon } from '../ui/Icon';
export function MatchIllustration() {
  return <div className="match-illustration" aria-hidden="true"><div className="match-orbit"/><div className="mini-profile mini-left"><span className="mini-avatar"><Icon name="mic"/></span><i/><i/></div><div className="mini-profile mini-right"><span className="mini-avatar"><Icon name="flower"/></span><i/><i/></div><div className="mini-profile mini-center"><span className="mini-avatar"><Icon name="camera"/></span><i/><i/><span className="mini-check"><Icon name="check"/></span></div><span className="match-spark spark-one">✳</span><span className="match-spark spark-two">+</span></div>;
}
