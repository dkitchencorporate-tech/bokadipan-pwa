import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BRAND_CONFIG } from './config/brandConfig';
import { ErrorBoundary } from './components/ErrorBoundary';

// Inyección dinámica de tokens de diseño desde brandConfig en tiempo de ejecución
function applyBrandTheme() {
  const { theme, name, slogan } = BRAND_CONFIG;
  const root = document.documentElement;

  if (theme) {
    if (theme.primary) root.style.setProperty('--brand-primary', theme.primary);
    if (theme.primaryHover) root.style.setProperty('--brand-primary-hover', theme.primaryHover);
    if (theme.primaryLight) root.style.setProperty('--brand-primary-light', theme.primaryLight || `${theme.primary}20`);
    if (theme.accent) root.style.setProperty('--brand-accent', theme.accent);
    if (theme.accentHover) root.style.setProperty('--brand-accent-hover', theme.accentHover);
    if (theme.surface) root.style.setProperty('--brand-surface', theme.surface);
    if (theme.card) root.style.setProperty('--brand-card', theme.card);
    if (theme.cardHover) root.style.setProperty('--brand-card-hover', theme.cardHover);
    if (theme.ink) root.style.setProperty('--brand-ink', theme.ink);
    if (theme.inkSoft) root.style.setProperty('--brand-ink-soft', theme.inkSoft);
    if (theme.border) root.style.setProperty('--brand-border', theme.border);
  }

  // Título y meta tags dinámicos
  if (name && document.title && !window.location.pathname.startsWith('/admin')) {
    document.title = `${name} | ${slogan || 'Gastronomía Digital'}`;
  }
}

applyBrandTheme();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Handle dynamic PWA manifest for Admin separation
if (window.location.pathname.startsWith('/admin')) {
  const manifestLink = document.getElementById('manifest-link');
  if (manifestLink) {
    manifestLink.setAttribute('href', '/manifest-admin.json');
  }
}

// Register Service Worker for PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SW registered!', reg.scope);
        reg.update().catch(() => {});
      })
      .catch(err => console.error('SW registration failed:', err));
  });
}
