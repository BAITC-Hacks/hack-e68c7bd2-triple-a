import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/form.css';
import './styles/results.css';
import './styles/responsive.css';

const root = document.getElementById('root');

if (!root) throw new Error('Application root was not found.');

createRoot(root).render(<StrictMode><App /></StrictMode>);
