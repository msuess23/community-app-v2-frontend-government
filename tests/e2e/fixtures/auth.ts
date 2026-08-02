import { expect, type Page } from '@playwright/test'

const authorityUser = {
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
      json: authorityUser,
      status: 200,
    })
  })

  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  await page
    .getByRole('textbox', { name: 'E-Mail-Adresse' })
    .fill(authorityUser.email)
  await page.getByLabel('Passwort').fill('test-password')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(returnTo)}$`))
}

/** Escapes a route so Playwright can assert the final browser URL safely. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
