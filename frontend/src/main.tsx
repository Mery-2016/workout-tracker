import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const savedTheme = localStorage.getItem('wt-theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}

const root = document.getElementById('root');
if (!root) throw new Error('root element is missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
