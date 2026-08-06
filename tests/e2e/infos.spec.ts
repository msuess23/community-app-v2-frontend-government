import { expect, test } from '@playwright/test'

import { expectNoSeriousAccessibilityViolations } from './fixtures/accessibility.js'
import {
  signInAsAuthorityUser,
  type AuthorityUserFixture,
} from './fixtures/auth.js'
import {
  INFO_ID,
  OFFICE_ID,
  installInfoApi,
  installInfoImageManagementApi,
  installInfoLifecycleApi,
  installInfoManagementApi,
} from './fixtures/info-api.js'
import {
  InfoDetailPageObject,
  InfoDirectoryPageObject,
  InfoEditorPageObject,
} from './pages/info-pages.js'

const dispatcherUser: AuthorityUserFixture = {
  email: 'dispatcher@example.test',
  first_name: 'Dora',
  id: '00000000-0000-4000-8000-000000000002',
  last_name: 'Dispatcher',
  office_id: OFFICE_ID,
  role: 'DISPATCHER',
}
const adminUser: AuthorityUserFixture = {
  email: 'admin@example.test',
  first_name: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  last_name: 'Admin',
  office_id: null,
  role: 'ADMIN',
}
const imageBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

test(
  'authority users can filter and inspect accessible Info publications',
  async ({ page }) => {
    const requests = await installInfoApi(page)
    const directory = new InfoDirectoryPageObject(page)
    const detail = new InfoDetailPageObject(page)

    await signInAsAuthorityUser(page, '/infos', dispatcherUser)
    await directory.expectLoaded()
    await expect(
      page.getByRole('combobox', { name: 'Einträge pro Seite' }),
    ).toHaveValue('20')

    const reloadedDirectoryRequest = page.waitForRequest((request) => {
      const url = new URL(request.url())
      return (
        url.pathname === '/api/v1/infos' &&
        url.searchParams.get('size') === '20'
      )
    })
    await page.reload()
    await reloadedDirectoryRequest
    await expect(
      page.getByRole('combobox', { name: 'Einträge pro Seite' }),
    ).toHaveValue('20')

    await directory.search('Stadtteil Fest')
    await directory.setFilters({
      category: 'EVENT',
      sort: 'updatedAt:desc',
      status: 'ACTIVE',
    })
    await expect
      .poll(() => new URL(page.url()).searchParams.get('category'))
      .toBe('EVENT')
    await expect
      .poll(() => new URL(page.url()).searchParams.get('status'))
      .toBe('ACTIVE')
    await expect
      .poll(() => new URL(page.url()).searchParams.get('sortBy'))
      .toBe('updatedAt')
    await expect
      .poll(() => new URL(page.url()).searchParams.get('sortDirection'))
      .toBe('desc')
    await expect
      .poll(() =>
        requests.some((request) => request.includes('category=EVENT')),
      )
      .toBe(true)
    await expect
      .poll(() =>
        requests.some((request) => request.includes('status=ACTIVE')),
      )
      .toBe(true)
    await expect
      .poll(() =>
        requests.some(
          (request) =>
            request.includes('sort_by=updated_at') &&
            request.includes('order=desc'),
        ),
      )
      .toBe(true)

    await directory.openInfo('Stadtteilfest')
    await expect(page).toHaveURL(new RegExp(`/infos/${INFO_ID}$`))
    await detail.expectLoaded('Stadtteilfest')
    await expect(
      page.getByText('Musterstraße 12a', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('img', {
        name: 'Bühne und Informationsstände auf dem Leipziger Markt',
      }),
    ).toBeVisible()
    await expect(page.getByText('Findet wie geplant statt.')).toBeVisible()
    await expect(page.getByText(INFO_ID)).toHaveCount(0)
    await expect(page.getByText('Breitengrad')).toHaveCount(0)
    await expect(page.getByText('Längengrad')).toHaveCount(0)

    expect(requests.some((request) => request.includes('q=Stadtteil+Fest'))).toBe(
      true,
    )
    expect(requests.some((request) => request.includes('category=EVENT'))).toBe(
      true,
    )
    expect(requests.some((request) => request.includes('status=ACTIVE'))).toBe(
      true,
    )
    expect(
      requests.some(
        (request) =>
          request.includes('sort_by=updated_at') &&
          request.includes('order=desc'),
      ),
    ).toBe(true)
    expect(requests.every((request) => !request.includes('bbox='))).toBe(true)

    await expectNoSeriousAccessibilityViolations(page)
  },
)

test(
  'administrators upload Info images sequentially and manage the cover',
  async ({ page }) => {
    const requests = await installInfoImageManagementApi(page)
    const editor = new InfoEditorPageObject(page)

    await signInAsAuthorityUser(page, `/infos/${INFO_ID}/edit`, adminUser)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Stadtteilfest' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Bilder hochladen' }),
    ).toBeVisible()

    await editor.selectImages([
      {
        altText: 'Umleitung rund um die gesperrte Parkstraße',
        buffer: imageBuffer,
        filename: 'umleitung.png',
      },
      {
        altText: 'Lageplan mit Bühne und Informationsständen',
        buffer: imageBuffer,
        filename: 'lageplan.png',
      },
    ])
    await editor.uploadQueuedImages()

    await expect(
      page.getByRole('img', {
        name: 'Umleitung rund um die gesperrte Parkstraße',
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('img', {
        name: 'Lageplan mit Bühne und Informationsständen',
      }),
    ).toBeVisible()
    expect(requests.maximumConcurrentUploads).toBe(1)
    expect(requests.uploadBodies).toHaveLength(2)

    await page
      .getByRole('button', {
        name: 'Als Titelbild verwenden: Lageplan mit Bühne und Informationsständen',
      })
      .click()
    const selectedCover = page
      .getByRole('img', {
        name: 'Lageplan mit Bühne und Informationsständen',
      })
      .locator('xpath=ancestor::figure')
    await expect(selectedCover.getByText('Titelbild')).toBeVisible()

    await page
      .getByRole('button', {
        name: 'Bild löschen: Lageplan mit Bühne und Informationsständen',
      })
      .click()
    const confirmation = page.getByRole('dialog', { name: 'Bild löschen?' })
    await expect(confirmation).toContainText(
      'das älteste verbleibende Bild als neues Titelbild',
    )
    await confirmation
      .getByRole('button', { name: 'Bild endgültig löschen' })
      .click()

    await expect(
      page.getByRole('img', {
        name: 'Lageplan mit Bühne und Informationsständen',
      }),
    ).toHaveCount(0)
    const replacementCover = page
      .getByRole('img', {
        name: 'Bühne und Informationsstände auf dem Leipziger Markt',
      })
      .locator('xpath=ancestor::figure')
    await expect(replacementCover.getByText('Titelbild')).toBeVisible()
    expect(requests.coverImageIds).toEqual(['image-upload-2'])
    expect(requests.deletedImageIds).toEqual(['image-upload-2'])

    await expectNoSeriousAccessibilityViolations(page)
  },
)

test(
  'administrators can create and minimally edit Info master data',
  async ({ page }) => {
    const requests = await installInfoManagementApi(page)
    const directory = new InfoDirectoryPageObject(page)
    const editor = new InfoEditorPageObject(page)
    const detail = new InfoDetailPageObject(page)

    await signInAsAuthorityUser(page, '/infos', adminUser)
    await directory.openCreate()
    await editor.expectCreateLoaded()
    await editor.fillCreateMasterData({
      category: 'CONSTRUCTION',
      endsAt: '2026-08-12T20:00',
      officeId: OFFICE_ID,
      startsAt: '2026-08-12T17:00',
      title: 'Straßensperrung Innenstadt',
    })
    await editor.fillAddress({
      city: 'Leipzig',
      houseNumber: '1',
      street: 'Markt',
      zipCode: '04109',
    })
    await editor.selectImages([
      {
        altText: 'Absperrung und ausgeschilderte Umleitung am Markt',
        buffer: imageBuffer,
        filename: 'sperrung.png',
      },
      {
        altText: 'Blick auf die abgesperrte Straße am Leipziger Markt',
        buffer: imageBuffer,
        filename: 'titelbild.png',
      },
    ])
    await editor.markProspectiveCover('titelbild.png')
    await expect(
      page.getByRole('button', { name: 'Bilder hochladen' }),
    ).toHaveCount(0)

    await expectNoSeriousAccessibilityViolations(page)
    await editor.submitCreate()

    await expect(page).toHaveURL(new RegExp(`/infos/${INFO_ID}$`))
    await detail.expectLoaded('Straßensperrung Innenstadt')
    expect(requests.requestOrder).toEqual(['info', 'image', 'image'])
    expect(requests.uploadBodies).toHaveLength(2)
    expect(requests.uploadBodies[0]).toContain(
      'Blick auf die abgesperrte Straße am Leipziger Markt',
    )
    expect(requests.uploadBodies[1]).toContain(
      'Absperrung und ausgeschilderte Umleitung am Markt',
    )

    await detail.openEdit()
    await editor.updateDescription('Umleitung über den Innenstadtring.')
    await expect(page).toHaveURL(new RegExp(`/infos/${INFO_ID}$`))
    await expect(
      page.getByText('Umleitung über den Innenstadtring.'),
    ).toBeVisible()

    expect(requests.create).toEqual({
      address: {
        city: 'Leipzig',
        house_number: '1',
        street: 'Markt',
        zip_code: '04109',
      },
      category: 'CONSTRUCTION',
      description: null,
      ends_at: '2026-08-12T18:00:00.000Z',
      office_id: OFFICE_ID,
      starts_at: '2026-08-12T15:00:00.000Z',
      title: 'Straßensperrung Innenstadt',
    })
    expect(requests.update).toEqual({
      description: 'Umleitung über den Innenstadtring.',
    })
  },
)

test(
  'administrators publish public status entries and permanently delete Infos',
  async ({ page }) => {
    const requests = await installInfoLifecycleApi(page)
    const detail = new InfoDetailPageObject(page)

    await signInAsAuthorityUser(page, `/infos/${INFO_ID}`, adminUser)
    await detail.expectLoaded('Stadtteilfest')

    await page.getByRole('button', { name: 'Status aktualisieren' }).click()
    const statusDialog = page.getByRole('dialog', {
      name: 'Status aktualisieren',
    })
    await statusDialog
      .getByRole('combobox', { name: /Neuer Status/ })
      .selectOption('CANCELLED')
    await statusDialog
      .getByRole('textbox', { name: 'Öffentliche Nachricht' })
      .fill('Das Fest fällt wegen des Unwetters aus.')
    await expectNoSeriousAccessibilityViolations(page)
    await statusDialog
      .getByRole('button', { name: 'Status veröffentlichen' })
      .click()

    await expect(page.getByText('Abgesagt').first()).toBeVisible()
    await expect(
      page.getByText('Das Fest fällt wegen des Unwetters aus.'),
    ).toBeVisible()
    expect(requests.statusUpdates).toEqual([
      {
        message: 'Das Fest fällt wegen des Unwetters aus.',
        status: 'CANCELLED',
      },
    ])

    await page.getByRole('button', { name: 'Mitteilung löschen' }).click()
    const deleteDialog = page.getByRole('dialog', {
      name: 'Mitteilung endgültig löschen',
    })
    await expect(deleteDialog).toContainText('öffentliche Statusverlauf')
    await expect(deleteDialog).toContainText('Bilddateien')
    await expect(deleteDialog.getByRole('textbox')).toHaveCount(0)
    await expectNoSeriousAccessibilityViolations(page)
    await deleteDialog
      .getByRole('button', { name: 'Mitteilung endgültig löschen' })
      .click()

    await expect(page).toHaveURL(/\/infos$/)
    await directoryHeading(page)
    expect(requests.deletedInfoIds).toEqual([INFO_ID])
  },
)

async function directoryHeading(page: import('@playwright/test').Page) {
  await expect(
    page.getByRole('heading', { level: 1, name: 'Mitteilungen' }),
  ).toBeVisible()
}
