import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 90000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5177', channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true, trace: 'retain-on-failure' },
  webServer: [
    { command: 'node scripts/mediaTestServer.js', cwd: '../tinzel-backend', url: 'http://127.0.0.1:5077/api/health', reuseExistingServer: false, timeout: 120000 },
    { command: 'VITE_API_URL= VITE_PROXY_TARGET=http://127.0.0.1:5077 npm run dev -- --host 127.0.0.1 --port 5177', url: 'http://127.0.0.1:5177', reuseExistingServer: false },
  ],
});
