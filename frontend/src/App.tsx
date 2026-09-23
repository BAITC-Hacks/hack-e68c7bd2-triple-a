import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { SearchPage } from './pages/SearchPage';

export default function App() {
  return (
    <div className="shell" id="top">
      <a className="skip-link" href="#search">Перейти к подбору</a>
      <Header />
      <SearchPage />
      <Footer />
    </div>
  );
}
