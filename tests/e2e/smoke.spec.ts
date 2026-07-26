import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('application loads', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Behördenclient' }),
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

test('shared UI kit has no serious accessibility violations', async ({
  page,
}) => {
  await page.goto('/ui-kit')

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
