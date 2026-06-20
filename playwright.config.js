import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3099',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node e2e/server.js',
    url: 'http://127.0.0.1:3099',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
