import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

// Reproducible UX checks against a production bundle and disposable backend.
export default defineConfig({ ...base, webServer: [base.webServer[0], {
  command: 'VITE_API_URL= npm run build && VITE_PROXY_TARGET=http://127.0.0.1:5077 npm run preview -- --host 127.0.0.1 --port 5177',
  url: 'http://127.0.0.1:5177', reuseExistingServer: false, timeout: 120000,
}] });
