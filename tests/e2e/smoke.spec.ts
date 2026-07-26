import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

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

test('shared UI kit loads', async ({ page }) => {
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

  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  type AxeViolation = (typeof scan.violations)[number]
  const seriousViolations = scan.violations.filter(
    (violation: AxeViolation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
  )

  expect(seriousViolations).toEqual([])
})

test('unknown routes show a not-found page', async ({ page }) => {
  await page.goto('/nicht-vorhanden')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Seite nicht gefunden' }),
  ).toBeVisible()
})
