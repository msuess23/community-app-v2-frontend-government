import { defineConfig, devices } from '@playwright/test'

const frontendBaseUrl =
  process.env.FULLSTACK_FRONTEND_BASE_URL ?? 'http://localhost:5173'
const apiBaseUrl =
  process.env.FULLSTACK_API_BASE_URL ?? 'http://localhost:8000/api/v1'
const frontendUrl = new URL(frontendBaseUrl)
const frontendPort =
  frontendUrl.port || (frontendUrl.protocol === 'https:' ? '443' : '80')

export default defineConfig({
  testDir: './tests/fullstack',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  // A retry would run against already mutated seed data. Reset/reseed instead.
  retries: 0,
  timeout: 360_000,
  expect: {
    timeout: 12_000,
  },
  outputDir: 'test-results-fullstack',
  reporter: [
    ['list'],
    [
      'html',
      { open: 'never', outputFolder: 'playwright-report-fullstack' },
    ],
  ],

  use: {
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    baseURL: frontendBaseUrl,
    locale: 'de-DE',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'fullstack-chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  webServer: {
    command: `npm run dev -- --host ${frontendUrl.hostname} --port ${frontendPort}`,
    env: {
      VITE_API_BASE_URL: apiBaseUrl,
    },
    reuseExistingServer: false,
    url: frontendBaseUrl,
  },
})
