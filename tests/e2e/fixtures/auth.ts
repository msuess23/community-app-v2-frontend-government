import { expect, type Page } from '@playwright/test'

export type AuthorityUserFixture = Readonly<{
  email: string
  first_name: string
  id: string
  last_name: string
  office_id: string | null
  role: 'ADMIN' | 'DISPATCHER' | 'MANAGER' | 'OFFICER'
}>

const authorityUser: AuthorityUserFixture = {
  email: 'admin@example.test',
  first_name: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  last_name: 'Admin',
  office_id: null,
  role: 'ADMIN',
}

/** Signs in through the real UI while intercepting only the required backend calls. */
export async function signInAsAuthorityUser(
  page: Page,
  returnTo = '/',
  user: AuthorityUserFixture = authorityUser,
): Promise<void> {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        access_token: 'e2e-access-token',
        refresh_token: 'e2e-refresh-token',
        token_type: 'bearer',
      },
      status: 200,
    })
  })
  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: user,
      status: 200,
    })
  })
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        access_token: 'e2e-refreshed-access-token',
        refresh_token: 'e2e-refreshed-refresh-token',
        token_type: 'bearer',
      },
      status: 200,
    })
  })

  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  await page
    .getByRole('textbox', { name: 'E-Mail-Adresse' })
    .fill(user.email)
  await page.getByLabel('Passwort').fill('test-password')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(returnTo)}$`))
}

/** Escapes a route so Playwright can assert the final browser URL safely. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
