import { expect, test } from '@playwright/test'

import { expectNoSeriousAccessibilityViolations } from './fixtures/accessibility.js'
import {
  signInAsAuthorityUser,
  type AuthorityUserFixture,
} from './fixtures/auth.js'
import {
  ADMIN_ID,
  CREATED_OFFICE_ID,
  OFFICE_ID,
  installOfficeApi,
} from './fixtures/office-api.js'

const officerUser: AuthorityUserFixture = {
  email: 'officer@example.com',
  first_name: 'Olivia',
  id: '00000000-0000-4000-8000-000000000002',
  last_name: 'Officer',
  office_id: OFFICE_ID,
  role: 'OFFICER',
}

test(
  'authority users can inspect offices without administrative actions',
  async ({ page }) => {
    const api = await installOfficeApi(page)

    await signInAsAuthorityUser(page, '/offices', officerUser)

    await expect(
      page.getByRole('heading', { level: 1, name: 'Behörden' }),
    ).toBeVisible()

    const searchbox = page.getByRole('searchbox', { name: 'Behörden suchen' })
    await searchbox.fill('Ordnung')
    await page.waitForTimeout(500)
    await expect(searchbox).toBeFocused()
    await searchbox.pressSequentially('samt')
    await expect(searchbox).toHaveValue('Ordnungsamt')

    const sortSelect = page.getByRole('combobox', { name: 'Sortierung' })
    if (!(await sortSelect.isVisible())) {
      await page
        .getByRole('button', { name: /Behörden filtern und sortieren/ })
        .click()
    }
    await sortSelect.selectOption('createdAt:desc')
    await expect(page).toHaveURL(/sortBy=createdAt/)
    await expect(page).toHaveURL(/sortDirection=desc/)
    await expect(
      page.getByRole('link', { name: 'Behörde anlegen' }),
    ).toHaveCount(0)

    await page
      .locator('a:visible')
      .filter({ hasText: 'Ordnungsamt' })
      .first()
      .click()

    await expect(page).toHaveURL(new RegExp(`/offices/${OFFICE_ID}$`))
    await expect(
      page.getByRole('heading', { level: 1, name: 'Ordnungsamt' }),
    ).toBeVisible()
    await expect(
      page.getByText('Musterstraße 12a', { exact: true }),
    ).toBeVisible()
    await expect(page.getByText('04109 Leipzig', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'ordnung@example.com' }),
    ).toHaveAttribute('href', 'mailto:ordnung@example.com')
    await expect(
      page.getByRole('link', { name: 'Behörde bearbeiten' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: 'Änderungshistorie' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Behörde deaktivieren' }),
    ).toHaveCount(0)
    expect(api.listStatuses.length).toBeGreaterThan(0)
    expect(api.listStatuses.every((status) => status === 'active')).toBe(true)
    expect(api.listSorts).toContainEqual({
      order: 'desc',
      sortBy: 'created_at',
    })

    await expectNoSeriousAccessibilityViolations(page)

    await page.goto('/offices/new')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Zugriff nicht erlaubt' }),
    ).toBeVisible()
  },
)

test(
  'administrators can create and edit structured office master data',
  async ({ page }) => {
    const api = await installOfficeApi(page)

    await signInAsAuthorityUser(page, '/offices')
    await page.getByRole('link', { name: 'Behörde anlegen' }).click()

    await page
      .getByRole('textbox', { name: 'Name der Behörde' })
      .fill('Bürgerbüro Süd')
    await page
      .getByRole('textbox', { name: 'Kontakt-E-Mail-Adresse' })
      .fill('sued@example.com')
    await page.getByRole('button', { name: 'Leistung hinzufügen' }).click()
    await page
      .getByRole('textbox', { name: 'Leistung 1' })
      .fill('Meldebescheinigungen')
    await page
      .getByRole('combobox', { name: 'Status am Montag' })
      .selectOption('open')
    await page.getByLabel('Startzeit, Intervall 1').fill('08:00')
    await page.getByLabel('Endzeit, Intervall 1').fill('12:00')
    const addressCheckbox = page.getByRole('checkbox', {
      name: 'Postadresse hinterlegen',
    })
    await addressCheckbox.focus()
    await addressCheckbox.press('Space')
    await expect(addressCheckbox).toBeChecked()
    await page.getByRole('textbox', { name: 'Straße' }).fill('Südstraße')
    await page.getByRole('textbox', { name: 'Hausnummer' }).fill('8')
    await page.getByRole('textbox', { name: 'Postleitzahl' }).fill('04275')
    await page.getByRole('textbox', { name: 'Ort' }).fill('Leipzig')
    await page.getByRole('button', { name: 'Behörde anlegen' }).click()

    await expect(page).toHaveURL(
      new RegExp(`/offices/${CREATED_OFFICE_ID}$`),
    )
    await expect(
      page.getByRole('heading', { level: 1, name: 'Bürgerbüro Süd' }),
    ).toBeVisible()
    await expect(page.getByText('Behörde angelegt')).toBeVisible()
    expect(api.createRequests).toEqual([
      expect.objectContaining({
        address: {
          city: 'Leipzig',
          house_number: '8',
          street: 'Südstraße',
          zip_code: '04275',
        },
        contact_email: 'sued@example.com',
        name: 'Bürgerbüro Süd',
        opening_hours: { monday: '08:00-12:00' },
        services: ['Meldebescheinigungen'],
      }),
    ])

    await page.getByRole('link', { name: 'Behörde bearbeiten' }).click()
    await page
      .getByRole('textbox', { name: 'Beschreibung' })
      .fill('Zentrale Anlaufstelle im Leipziger Süden.')
    await page
      .getByRole('textbox', { name: /Änderungsgrund/ })
      .fill('Beschreibung für die Veröffentlichung ergänzt')
    await page.getByRole('button', { name: 'Änderungen speichern' }).click()

    await expect(page).toHaveURL(
      new RegExp(`/offices/${CREATED_OFFICE_ID}$`),
    )
    await expect(page.getByText('Behörde gespeichert')).toBeVisible()
    await expect(
      page.getByText('Zentrale Anlaufstelle im Leipziger Süden.'),
    ).toBeVisible()
    expect(api.updateRequests).toEqual([
      {
        change_reason: 'Beschreibung für die Veröffentlichung ergänzt',
        description: 'Zentrale Anlaufstelle im Leipziger Süden.',
      },
    ])
  },
)

test(
  'administrators can deactivate an office and inspect its result-state history',
  async ({ page }) => {
    const api = await installOfficeApi(page)
    await page.route(`**/api/v1/users/${ADMIN_ID}`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          email: 'admin@example.com',
          first_name: 'Ada',
          id: ADMIN_ID,
          last_name: 'Admin',
          metadata: {
            created_at: '2026-01-01T00:00:00Z',
            deactivated_at: null,
            is_active: true,
          },
          office_id: null,
          role: 'ADMIN',
        },
        status: 200,
      })
    })

    await signInAsAuthorityUser(page, `/offices/${OFFICE_ID}`)
    await page.getByRole('button', { name: 'Behörde deaktivieren' }).click()
    await page
      .getByRole('textbox', { name: /Änderungsgrund/ })
      .fill('Behördenstandort dauerhaft geschlossen')
    await page
      .getByRole('button', { name: 'Behörde endgültig deaktivieren' })
      .click()

    await expect(page.getByText('Behörde deaktiviert')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Behörde deaktivieren' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: 'Behörde bearbeiten' }),
    ).toHaveCount(0)
    expect(api.deactivateRequests).toEqual([
      { change_reason: 'Behördenstandort dauerhaft geschlossen' },
    ])

    await page.getByRole('link', { name: 'Änderungshistorie' }).click()
    await expect(page).toHaveURL(
      new RegExp(`/offices/${OFFICE_ID}/history$`),
    )
    await expect(
      page.getByRole('heading', { level: 1, name: 'Ordnungsamt' }),
    ).toBeVisible()
    await expect(
      page
        .getByText('Behördenstandort dauerhaft geschlossen', { exact: true })
        .filter({ visible: true }),
    ).toBeVisible()
    await expect(
      page.locator('a:visible').filter({ hasText: 'Ada Admin' }).first(),
    ).toBeVisible()

    const desktopDisclosure = page.getByRole('button', {
      name: 'Details anzeigen',
    })
    if (await desktopDisclosure.isVisible()) {
      await desktopDisclosure.click()
    } else {
      await page
        .getByText('Vollständigen Behördenstand anzeigen', { exact: true })
        .click()
    }

    await expect(
      page.getByText(/Musterstraße 12a/).filter({ visible: true }),
    ).toBeVisible()
    await expect(
      page.getByText(/04109 Leipzig/).filter({ visible: true }),
    ).toBeVisible()
    await expectNoSeriousAccessibilityViolations(page)
  },
)
