import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { applyInitialTheme } from './utils/theme';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/cyrillic-400.css';
import '@fontsource/manrope/cyrillic-500.css';
import '@fontsource/manrope/cyrillic-600.css';
import '@fontsource/manrope/cyrillic-700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/form.css';
import './styles/results.css';
import './styles/responsive.css';
import './styles/redesign.css';

applyInitialTheme();

const root = document.getElementById('root');

if (!root) throw new Error('Application root was not found.');

createRoot(root).render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>);
