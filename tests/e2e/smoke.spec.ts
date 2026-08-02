import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signInAsAuthorityUser } from './fixtures/auth'

test('anonymous users are redirected to login', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Anmelden' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/login\?returnTo=/)
})

test('registration page loads', async ({ page }) => {
  await page.goto('/register')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Bürgerkonto erstellen' }),
  ).toBeVisible()
})

test('shared UI kit loads in the development server', async ({ page }) => {
  await page.goto('/ui-kit')

  await expect(
    page.getByRole('heading', { level: 1, name: 'UI-Bausteine' }),
  ).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: 'E-Mail-Adresse' }).first(),
  ).toBeVisible()
})

test('authentication entry has no serious accessibility violations', async ({
  page,
}) => {
  await page.goto('/login')

  await expectNoSeriousAccessibilityViolations(page)
})

test('unknown protected routes redirect anonymous users to login', async ({
  page,
}) => {
  await page.goto('/nicht-vorhanden')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Anmelden' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/returnTo=%2Fnicht-vorhanden/)
})

test('unknown protected routes show a not-found page after login', async ({
  page,
}) => {
  await signInAsAuthorityUser(page, '/nicht-vorhanden')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Seite nicht gefunden' }),
  ).toBeVisible()
})

test('authenticated app shell has no serious accessibility violations', async ({
  page,
}) => {
  await signInAsAuthorityUser(page)

  await expect(
    page.getByRole('heading', { level: 1, name: 'Übersicht' }),
  ).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page)
})

/** Fails the scenario when Axe reports serious WCAG violations. */
async function expectNoSeriousAccessibilityViolations(
  page: import('@playwright/test').Page,
): Promise<void> {
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const seriousViolations = scan.violations.filter(
    (violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
  )

  expect(seriousViolations).toEqual([])
}
