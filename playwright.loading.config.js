import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', workers: 1, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:5188', channel: 'chrome', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'VITE_API_URL= npm run dev -- --host 127.0.0.1 --port 5188', url: 'http://127.0.0.1:5188', reuseExistingServer: false },
});
