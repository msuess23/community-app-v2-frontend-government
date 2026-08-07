import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

import {
  FULLSTACK_API_BASE_URL,
  FULLSTACK_FRONTEND_BASE_URL,
  type FullStackAccount,
} from './fullstack-environment.js'

const REFRESH_TOKEN_STORAGE_KEY =
  'community-app-authority-client.refresh-token'

export type AuthenticatedBrowser = Readonly<{
  context: BrowserContext
  page: Page
}>

/** Registers a real citizen account through the public browser form. */
export async function registerCitizenThroughUi(
  browser: Browser,
  account: FullStackAccount,
): Promise<void> {
  const context = await browser.newContext({
    baseURL: FULLSTACK_FRONTEND_BASE_URL,
    locale: 'de-DE',
  })
  const page = await context.newPage()

  try {
    await page.goto('/register', {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    })

    await page
      .getByRole('textbox', { name: 'Vorname' })
      .fill(account.firstName)
    await page
      .getByRole('textbox', { name: 'Nachname' })
      .fill(account.lastName)
    await page
      .getByRole('textbox', { name: 'E-Mail-Adresse' })
      .fill(account.email)
    await page
      .getByLabel('Passwort', { exact: true })
      .fill(account.password)
    await page
      .getByLabel('Passwort bestätigen')
      .fill(account.password)

    const registrationResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/auth/register') &&
        response.request().method() === 'POST',
      { timeout: 20_000 },
    )

    await page
      .getByRole('button', { name: 'Konto erstellen' })
      .click()

    const registrationResponse = await registrationResponsePromise

    if (registrationResponse.status() !== 201) {
      throw new Error(
        `Registration for ${account.email} failed with HTTP ${
          registrationResponse.status()
        }: ${await registrationResponse.text()}`,
      )
    }

    await expect(page).toHaveURL(/\/login\?registered=1$/)
  } finally {
    await context.close()
  }
}

/** Creates an isolated browser session and authenticates it through the real login endpoint. */
export async function loginThroughUi(
  browser: Browser,
  account: FullStackAccount,
  returnTo = '/',
  rememberMe = false,
): Promise<AuthenticatedBrowser> {
  const context = await browser.newContext({
    baseURL: FULLSTACK_FRONTEND_BASE_URL,
    locale: 'de-DE',
  })
  const page = await context.newPage()

  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  await page
    .getByRole('textbox', { name: 'E-Mail-Adresse' })
    .fill(account.email)
  await page.getByLabel('Passwort').fill(account.password)

  if (rememberMe) {
    const checkbox = page.getByRole('checkbox', { name: 'Angemeldet bleiben' })
    await checkbox.focus()
    await checkbox.press('Space')
    await expect(checkbox).toBeChecked()
  }

  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(returnTo)}$`))

  return { context, page }
}

/** Verifies the application's real reload-based refresh flow and backend token rotation. */
export async function expectRealTokenRefreshAfterReload(
  page: Page,
  expectedPersistence?: RefreshTokenPersistence,
): Promise<void> {
  const before = await readStoredRefreshSession(page)
  expect(before?.refreshToken).toBeTruthy()
  if (expectedPersistence) {
    expect(before?.persistence).toBe(expectedPersistence)
  }

  const refreshUrl = new URL(
    `${FULLSTACK_API_BASE_URL.replace(/\/$/, '')}/auth/refresh`,
    FULLSTACK_FRONTEND_BASE_URL,
  ).toString()
  const refreshResponse = page.waitForResponse(
    (response) =>
      response.url() === refreshUrl && response.request().method() === 'POST',
  )

  await page.reload()

  const response = await refreshResponse
  expect(response.status()).toBe(200)
  const requestBody = response.request().postDataJSON() as {
    refresh_token?: string
  }
  expect(requestBody.refresh_token).toBe(before?.refreshToken)
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible()

  await expect
    .poll(async () => (await readStoredRefreshSession(page))?.refreshToken)
    .not.toBe(before?.refreshToken)

  const after = await readStoredRefreshSession(page)
  expect(after?.refreshToken).toBeTruthy()
  expect(after?.sessionId).toBe(before?.sessionId)
  expect(after?.persistence).toBe(before?.persistence)
}

type RefreshTokenPersistence = 'persistent' | 'session'

type StoredRefreshSession = Readonly<{
  persistence: RefreshTokenPersistence
  refreshToken: string
  sessionId: string
  version: number
}>

async function readStoredRefreshSession(
  page: Page,
): Promise<StoredRefreshSession | null> {
  return page.evaluate((storageKey) => {
    const browser = globalThis as unknown as {
      localStorage: { getItem: (key: string) => string | null }
      sessionStorage: { getItem: (key: string) => string | null }
    }
    const sessionValue = browser.sessionStorage.getItem(storageKey)
    const persistentValue = browser.localStorage.getItem(storageKey)
    const raw = sessionValue ?? persistentValue
    if (!raw) return null

    const parsed = JSON.parse(raw) as Omit<StoredRefreshSession, 'persistence'>
    return {
      ...parsed,
      persistence: sessionValue ? 'session' : 'persistent',
    } as StoredRefreshSession
  }, REFRESH_TOKEN_STORAGE_KEY)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
