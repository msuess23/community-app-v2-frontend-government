import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('password recovery entry pages load', async ({ page }) => {
  await page.goto('/password-forgotten')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Passwort vergessen' }),
  ).toBeVisible()

  await page.goto('/password-reset?email=citizen%40test.com')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Passwort zurücksetzen' }),
  ).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: 'E-Mail-Adresse' }),
  ).toHaveValue('citizen@test.com')
})

test('password recovery entry has no serious accessibility violations', async ({
  page,
}) => {
  await page.goto('/password-forgotten')

  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  expect(
    scan.violations.filter(({ impact }) =>
      ['critical', 'serious'].includes(impact ?? ''),
    ),
  ).toEqual([])
})
