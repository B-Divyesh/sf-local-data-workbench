import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // The offline claim intentionally opens an isolated context. Keeping one
  // Chromium worker avoids a headless-shell crash seen when that context races
  // other browser fixtures on constrained Linux CI runners.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'line',
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, userAgent: devices['iPhone 13'].userAgent } }
  ],
  webServer: [
    // Run claims against Vite's emitted files so the service-worker test covers
    // the hashed demo module that visitors receive, not only dev modules.
    { command: 'npm run build:site && npx vite preview --config vite.site.config.ts --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
    { command: 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:1420', reuseExistingServer: true }
  ]
});
