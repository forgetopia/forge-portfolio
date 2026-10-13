import { defineConfig } from '@playwright/test';

const port = process.env.PORTFOLIO_TEST_PORT ?? '4173';
const baseURL = `http://127.0.0.1:${port}`;
const browser = process.env.PORTFOLIO_TEST_BROWSER ?? 'chromium';
if (browser !== 'chromium' && browser !== 'firefox' && browser !== 'webkit') {
  throw new Error('PORTFOLIO_TEST_BROWSER must be chromium, firefox, or webkit.');
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL,
    browserName: browser,
    trace: 'retain-on-failure',
    launchOptions: browser === 'chromium' && process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: 'node tests/static-server.mjs',
    url: baseURL,
    reuseExistingServer: false,
    env: { PORTFOLIO_TEST_PORT: port },
  },
});
