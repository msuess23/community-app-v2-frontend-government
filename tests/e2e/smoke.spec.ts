import { expect, test } from '@playwright/test'

test('application loads', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Behördenclient' }),
  ).toBeVisible()
})

test('unknown routes show a not-found page', async ({ page }) => {
  await page.goto('/nicht-vorhanden')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Seite nicht gefunden' }),
  ).toBeVisible()
})
