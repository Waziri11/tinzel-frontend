import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

// Shared route and action coverage in Chromium and Safari's browser engine.
export default defineConfig({
  ...base,
  testMatch: /responsive-(layout|actions)\.spec\.js/,
  outputDir: './test-results/responsive',
  use: { ...base.use, channel: undefined, hasTouch: true, actionTimeout: 15000 },
  projects: [
    { name: 'chromium-touch', use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'webkit-touch', use: { browserName: 'webkit' } },
  ],
});
