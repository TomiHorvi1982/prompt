/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import posthog from 'posthog-js';
import App from './App.tsx';
import './index.css';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;

if (posthogKey && posthogHost) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: '2026-05-30',
  });
} else if (import.meta.env.DEV) {
  console.error(
    'VITE_POSTHOG_KEY or VITE_POSTHOG_HOST variable required by PostHog is missing or un-configured, ' +
    'this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_KEY and VITE_POSTHOG_HOST are configured'
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
