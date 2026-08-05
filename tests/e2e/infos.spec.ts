import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import {
  signInAsAuthorityUser,
  type AuthorityUserFixture,
} from './fixtures/auth.js'

const INFO_ID = '00000000-0000-4000-8000-000000000100'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'
const IMAGE_ID = '00000000-0000-4000-8000-000000000130'
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

test(
  'authority users can filter and inspect accessible Info publications',
  async ({ page }) => {
    const requests = await installInfoApi(page)
    await signInAsAuthorityUser(page, '/infos', dispatcherUser)

    await expect(
      page.getByRole('heading', { level: 1, name: 'Mitteilungen' }),
    ).toBeVisible()
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

    const searchbox = page.getByRole('searchbox', {
      name: 'Mitteilungen suchen',
    })
    await searchbox.fill('Stadtteil Fest')
    await page.waitForTimeout(500)
    await expect(searchbox).toBeFocused()

    const filterButton = page.getByRole('button', {
      name: /Mitteilungen filtern und sortieren/,
    })
    if (await filterButton.isVisible()) {
      await filterButton.click()
    }
    await page.getByRole('combobox', { name: 'Kategorie' }).selectOption('EVENT')
    await page.getByRole('combobox', { name: 'Status' }).selectOption('ACTIVE')
    const sortedRequest = page.waitForRequest((request) => {
      const url = new URL(request.url())
      return (
        url.pathname === '/api/v1/infos' &&
        url.searchParams.get('category') === 'EVENT' &&
        url.searchParams.get('status') === 'ACTIVE' &&
        url.searchParams.get('sort_by') === 'updated_at' &&
        url.searchParams.get('order') === 'desc'
      )
    })
    await page
      .getByRole('combobox', { name: 'Sortierung' })
      .selectOption('updatedAt:desc')
    await sortedRequest

    await page.getByRole('link', { name: 'Stadtteilfest' }).click()
    await expect(page).toHaveURL(new RegExp(`/infos/${INFO_ID}$`))
    await expect(
      page.getByRole('heading', { level: 1, name: 'Stadtteilfest' }),
    ).toBeVisible()
    await expect(page.getByText('Musterstraße 12a', { exact: true })).toBeVisible()
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
    expect(
      requests.some(
        (request) =>
          request.includes('category=EVENT') &&
          request.includes('status=ACTIVE') &&
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
    await signInAsAuthorityUser(page, `/infos/${INFO_ID}/edit`, adminUser)

    await expect(
      page.getByRole('heading', { level: 1, name: 'Stadtteilfest' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Bilder hochladen' }),
    ).toBeVisible()

    await page.getByLabel('Bilddateien auswählen').setInputFiles([
      {
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
        mimeType: 'image/png',
        name: 'umleitung.png',
      },
      {
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
        mimeType: 'image/png',
        name: 'lageplan.png',
      },
    ])
    await page
      .getByRole('textbox', { name: 'Alternativtext für umleitung.png' })
      .fill('Umleitung rund um die gesperrte Parkstraße')
    await page
      .getByRole('textbox', { name: 'Alternativtext für lageplan.png' })
      .fill('Lageplan mit Bühne und Informationsständen')

    await page.getByRole('button', { name: 'Bilder hochladen' }).click()
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
    expect(requests.uploadBodies[0]).toContain(
      'Umleitung rund um die gesperrte Parkstraße',
    )
    expect(requests.uploadBodies[1]).toContain(
      'Lageplan mit Bühne und Informationsständen',
    )

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
    await signInAsAuthorityUser(page, '/infos', adminUser)

    await page.getByRole('link', { name: 'Mitteilung anlegen' }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Mitteilung anlegen' }),
    ).toBeVisible()

    await page
      .getByRole('textbox', { name: /Titel/ })
      .fill('Straßensperrung Innenstadt')
    await page
      .getByRole('combobox', { name: /Kategorie/ })
      .selectOption('CONSTRUCTION')
    await page
      .getByRole('combobox', { name: 'Zuständige Behörde' })
      .selectOption(OFFICE_ID)
    await page.getByLabel('Beginn').fill('2026-08-12T17:00')
    await page.getByLabel('Ende').fill('2026-08-12T20:00')
    const addressCheckbox = page.getByRole('checkbox', {
      name: 'Adresse hinterlegen',
    })
    await addressCheckbox.focus()
    await addressCheckbox.press('Space')
    await expect(addressCheckbox).toBeChecked()
    await page.getByRole('textbox', { name: /Straße/ }).fill('Markt')
    await page.getByRole('textbox', { name: /Hausnummer/ }).fill('1')
    await page.getByRole('textbox', { name: /Postleitzahl/ }).fill('04109')
    await page.getByRole('textbox', { name: /Ort/ }).fill('Leipzig')
    const imageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    )
    await page.getByLabel('Bilddateien auswählen').setInputFiles([
      {
        buffer: imageBuffer,
        mimeType: 'image/png',
        name: 'sperrung.png',
      },
      {
        buffer: imageBuffer,
        mimeType: 'image/png',
        name: 'titelbild.png',
      },
    ])
    await page
      .getByRole('textbox', { name: 'Alternativtext für sperrung.png' })
      .fill('Absperrung und ausgeschilderte Umleitung am Markt')
    await page
      .getByRole('textbox', { name: 'Alternativtext für titelbild.png' })
      .fill('Blick auf die abgesperrte Straße am Leipziger Markt')
    await page
      .getByRole('button', {
        name: 'Als Titelbild vormerken: titelbild.png',
      })
      .click()
    await expect(
      page.getByRole('button', { name: 'Bilder hochladen' }),
    ).toHaveCount(0)

    await expectNoSeriousAccessibilityViolations(page)
    await page.getByRole('button', { name: 'Mitteilung anlegen' }).click()

    await expect(page).toHaveURL(new RegExp(`/infos/${INFO_ID}$`))
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Straßensperrung Innenstadt',
      }),
    ).toBeVisible()
    expect(requests.requestOrder).toEqual(['info', 'image', 'image'])
    expect(requests.uploadBodies).toHaveLength(2)
    expect(requests.uploadBodies[0]).toContain(
      'Blick auf die abgesperrte Straße am Leipziger Markt',
    )
    expect(requests.uploadBodies[1]).toContain(
      'Absperrung und ausgeschilderte Umleitung am Markt',
    )

    await page.getByRole('link', { name: 'Mitteilung bearbeiten' }).click()
    const description = page.getByRole('textbox', { name: 'Beschreibung' })
    await description.fill('Umleitung über den Innenstadtring.')
    await page.getByRole('button', { name: 'Änderungen speichern' }).click()

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
    await signInAsAuthorityUser(page, `/infos/${INFO_ID}`, adminUser)

    await expect(
      page.getByRole('heading', { level: 1, name: 'Stadtteilfest' }),
    ).toBeVisible()

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
    await expect(
      page.getByRole('heading', { level: 1, name: 'Mitteilungen' }),
    ).toBeVisible()
    expect(requests.deletedInfoIds).toEqual([INFO_ID])
  },
)

async function installInfoApi(page: Page): Promise<string[]> {
  const listRequests: string[] = []

  await page.route('**/api/v1/offices**', async (route) => {
    const url = new URL(route.request().url())
    const data = [officeResponse()]

    if (url.pathname === '/api/v1/offices') {
      await route.fulfill({
        contentType: 'application/json',
        json: { data, page: 1, pages: 1, size: 100, total: 1 },
        status: 200,
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      json: officeResponse(),
      status: 200,
    })
  })

  await page.route('**/api/v1/infos**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (path.endsWith(`/images/${IMAGE_ID}/content`)) {
      await route.fulfill({
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
        contentType: 'image/png',
        status: 200,
      })
      return
    }

    if (path === '/api/v1/infos') {
      listRequests.push(url.searchParams.toString())
      await route.fulfill({
        contentType: 'application/json',
        json: {
          data: [infoResponse()],
          page: 1,
          pages: 1,
          size: Number(url.searchParams.get('size') ?? 20),
          total: 1,
        },
        status: 200,
      })
      return
    }

    if (path.endsWith('/images')) {
      await route.fulfill({
        contentType: 'application/json',
        json: [imageResponse()],
        status: 200,
      })
      return
    }

    if (path.endsWith('/status')) {
      await route.fulfill({
        contentType: 'application/json',
        json: [infoResponse().current_status],
        status: 200,
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      json: infoResponse(),
      status: 200,
    })
  })

  return listRequests
}

function infoResponse() {
  return {
    address: {
      city: 'Leipzig',
      house_number: '12a',
      id: 'address-1',
      latitude: 51.34,
      longitude: 12.37,
      street: 'Musterstraße',
      zip_code: '04109',
    },
    category: 'EVENT',
    created_at: '2026-08-01T08:00:00Z',
    current_status: {
      created_at: '2026-08-02T08:00:00Z',
      id: 'status-active',
      message: 'Findet wie geplant statt.',
      status: 'ACTIVE',
    },
    description: 'Sommerfest mit Bühnenprogramm.',
    ends_at: '2026-08-12T20:00:00Z',
    id: INFO_ID,
    image_url: `/api/v1/infos/${INFO_ID}/images/${IMAGE_ID}/content`,
    office_id: OFFICE_ID,
    starts_at: '2026-08-12T15:00:00Z',
    title: 'Stadtteilfest',
    updated_at: '2026-08-02T08:00:00Z',
  }
}

function imageResponse(
  overrides: Readonly<{
    altText?: string
    id?: string
    isCover?: boolean
    originalFilename?: string
  }> = {},
) {
  const id = overrides.id ?? IMAGE_ID
  return {
    alt_text:
      overrides.altText ??
      'Bühne und Informationsstände auf dem Leipziger Markt',
    height: 1,
    id,
    info_id: INFO_ID,
    is_cover: overrides.isCover ?? true,
    mime_type: 'image/png',
    original_filename: overrides.originalFilename ?? 'markt.png',
    size_bytes: 68,
    uploaded_at: '2026-08-01T08:00:00Z',
    url: `/api/v1/infos/${INFO_ID}/images/${id}/content`,
    width: 1,
  }
}

function officeResponse() {
  return {
    address: null,
    contact_email: 'ordnung@example.test',
    description: null,
    id: OFFICE_ID,
    metadata: {
      created_at: '2026-01-01T08:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    name: 'Ordnungsamt',
    opening_hours: null,
    phone: null,
    services: [],
  }
}

async function installInfoManagementApi(page: Page): Promise<{
  create: unknown
  requestOrder: string[]
  update: unknown
  uploadBodies: string[]
}> {
  const requests = {
    create: null as unknown,
    requestOrder: [] as string[],
    update: null as unknown,
    uploadBodies: [] as string[],
  }
  let storedInfo: Record<string, unknown> = infoResponse()
  let images: Array<ReturnType<typeof imageResponse>> = []

  await page.route('**/api/v1/offices**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/v1/offices') {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          data: [officeResponse()],
          page: 1,
          pages: 1,
          size: 100,
          total: 1,
        },
        status: 200,
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      json: officeResponse(),
      status: 200,
    })
  })

  await page.route('**/api/v1/infos**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (path === '/api/v1/infos' && request.method() === 'POST') {
      requests.requestOrder.push('info')
      const body = request.postDataJSON() as Record<string, unknown>
      requests.create = body
      storedInfo = {
        ...storedInfo,
        ...body,
        address: body.address
          ? {
              id: 'address-1',
              latitude: null,
              longitude: null,
              ...(body.address as Record<string, unknown>),
            }
          : null,
        created_at: '2026-08-04T08:00:00Z',
        current_status: {
          created_at: '2026-08-04T08:00:00Z',
          id: 'status-created',
          message: 'Created',
          status: 'SCHEDULED',
        },
        id: INFO_ID,
        image_url: null,
        updated_at: '2026-08-04T08:00:00Z',
      }
      await route.fulfill({
        contentType: 'application/json',
        json: storedInfo,
        status: 201,
      })
      return
    }

    if (
      path === `/api/v1/infos/${INFO_ID}/images` &&
      request.method() === 'POST'
    ) {
      requests.requestOrder.push('image')
      const body = request.postDataBuffer()?.toString('utf8') ?? ''
      requests.uploadBodies.push(body)
      const imageNumber = images.length + 1
      const uploaded = imageResponse({
        altText: readMultipartValue(body, 'alt_text'),
        id: `created-image-${imageNumber}`,
        isCover: images.length === 0,
        originalFilename: readMultipartFilename(body) ?? 'upload.png',
      })
      images = [...images, uploaded]
      if (uploaded.is_cover) {
        storedInfo = { ...storedInfo, image_url: uploaded.url }
      }
      await route.fulfill({
        contentType: 'application/json',
        json: uploaded,
        status: 201,
      })
      return
    }

    if (path === `/api/v1/infos/${INFO_ID}` && request.method() === 'PUT') {
      const body = request.postDataJSON() as Record<string, unknown>
      requests.update = body
      storedInfo = {
        ...storedInfo,
        ...body,
        address:
          body.address === undefined
            ? storedInfo.address
            : body.address === null
              ? null
              : {
                  ...((storedInfo.address as
                    | Record<string, unknown>
                    | null) ?? {}),
                  ...(body.address as Record<string, unknown>),
                },
        updated_at: '2026-08-04T09:00:00Z',
      }
      await route.fulfill({
        contentType: 'application/json',
        json: storedInfo,
        status: 200,
      })
      return
    }

    if (path === '/api/v1/infos') {
      await route.fulfill({
        contentType: 'application/json',
        json: { data: [], page: 1, pages: 0, size: 20, total: 0 },
        status: 200,
      })
      return
    }

    if (path.endsWith('/images')) {
      await route.fulfill({
        contentType: 'application/json',
        json: images,
        status: 200,
      })
      return
    }

    if (path.endsWith('/status')) {
      await route.fulfill({
        contentType: 'application/json',
        json: [storedInfo.current_status],
        status: 200,
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      json: storedInfo,
      status: 200,
    })
  })

  return requests
}

async function installInfoImageManagementApi(page: Page): Promise<{
  coverImageIds: string[]
  deletedImageIds: string[]
  maximumConcurrentUploads: number
  uploadBodies: string[]
}> {
  const state = {
    coverImageIds: [] as string[],
    deletedImageIds: [] as string[],
    maximumConcurrentUploads: 0,
    uploadBodies: [] as string[],
  }
  let activeUploads = 0
  let uploadSequence = 0
  let images: Array<ReturnType<typeof imageResponse>> = [imageResponse()]

  await page.route('**/api/v1/offices**', async (route) => {
    const url = new URL(route.request().url())
    await route.fulfill({
      contentType: 'application/json',
      json:
        url.pathname === '/api/v1/offices'
          ? {
              data: [officeResponse()],
              page: 1,
              pages: 1,
              size: 100,
              total: 1,
            }
          : officeResponse(),
      status: 200,
    })
  })

  await page.route('**/api/v1/infos**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (path.endsWith('/content')) {
      await route.fulfill({
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
        contentType: 'image/png',
        status: 200,
      })
      return
    }

    if (path === `/api/v1/infos/${INFO_ID}/images` && request.method() === 'POST') {
      activeUploads += 1
      state.maximumConcurrentUploads = Math.max(
        state.maximumConcurrentUploads,
        activeUploads,
      )
      const body = request.postDataBuffer()?.toString('utf8') ?? ''
      state.uploadBodies.push(body)
      uploadSequence += 1
      await new Promise((resolve) => setTimeout(resolve, 25))
      const altText = readMultipartValue(body, 'alt_text')
      const filename = readMultipartFilename(body) ?? `upload-${uploadSequence}.png`
      const uploaded = imageResponse({
        altText,
        id: `image-upload-${uploadSequence}`,
        isCover: images.length === 0,
        originalFilename: filename,
      })
      images = [...images, uploaded]
      activeUploads -= 1
      await route.fulfill({
        contentType: 'application/json',
        json: uploaded,
        status: 201,
      })
      return
    }

    if (path === `/api/v1/infos/${INFO_ID}/images` && request.method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        json: images,
        status: 200,
      })
      return
    }

    const coverMatch = path.match(/\/images\/([^/]+)\/cover$/)
    if (coverMatch && request.method() === 'PUT') {
      const imageId = coverMatch[1]
      state.coverImageIds.push(imageId)
      images = images.map((image) => ({
        ...image,
        is_cover: image.id === imageId,
      }))
      await route.fulfill({
        contentType: 'application/json',
        json: images.find((image) => image.id === imageId),
        status: 200,
      })
      return
    }

    const deleteMatch = path.match(/\/images\/([^/]+)$/)
    if (deleteMatch && request.method() === 'DELETE') {
      const imageId = deleteMatch[1]
      state.deletedImageIds.push(imageId)
      const deletedCover = images.find((image) => image.id === imageId)?.is_cover
      images = images.filter((image) => image.id !== imageId)
      if (deletedCover && images.length > 0) {
        images = images.map((image, index) => ({
          ...image,
          is_cover: index === 0,
        }))
      }
      await route.fulfill({ status: 204 })
      return
    }

    if (path.endsWith('/status')) {
      await route.fulfill({
        contentType: 'application/json',
        json: [infoResponse().current_status],
        status: 200,
      })
      return
    }

    const cover = images.find((image) => image.is_cover)
    await route.fulfill({
      contentType: 'application/json',
      json: {
        ...infoResponse(),
        image_url: cover?.url ?? null,
      },
      status: 200,
    })
  })

  return state
}

async function installInfoLifecycleApi(page: Page): Promise<{
  deletedInfoIds: string[]
  statusUpdates: unknown[]
}> {
  const requests = {
    deletedInfoIds: [] as string[],
    statusUpdates: [] as unknown[],
  }
  let deleted = false
  let storedInfo: Record<string, unknown> = infoResponse()
  let statusHistory: Array<Record<string, unknown>> = [
    infoResponse().current_status,
  ]

  await page.route('**/api/v1/offices**', async (route) => {
    const url = new URL(route.request().url())

    await route.fulfill({
      contentType: 'application/json',
      json:
        url.pathname === '/api/v1/offices'
          ? {
              data: [officeResponse()],
              page: 1,
              pages: 1,
              size: 100,
              total: 1,
            }
          : officeResponse(),
      status: 200,
    })
  })

  await page.route('**/api/v1/infos**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (path.endsWith('/content')) {
      await route.fulfill({
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
        contentType: 'image/png',
        status: 200,
      })
      return
    }

    if (
      path === `/api/v1/infos/${INFO_ID}/status` &&
      request.method() === 'PUT'
    ) {
      const body = request.postDataJSON() as {
        message: string | null
        status: string
      }
      requests.statusUpdates.push(body)
      const entry = {
        created_at: '2026-08-05T08:00:00Z',
        id: 'status-cancelled',
        message: body.message,
        status: body.status,
      }
      statusHistory = [entry, ...statusHistory]
      storedInfo = {
        ...storedInfo,
        current_status: entry,
        updated_at: entry.created_at,
      }
      await route.fulfill({
        contentType: 'application/json',
        json: entry,
        status: 200,
      })
      return
    }

    if (path === `/api/v1/infos/${INFO_ID}` && request.method() === 'DELETE') {
      requests.deletedInfoIds.push(INFO_ID)
      deleted = true
      await route.fulfill({ status: 204 })
      return
    }

    if (path === '/api/v1/infos') {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          data: deleted ? [] : [storedInfo],
          page: 1,
          pages: deleted ? 0 : 1,
          size: 20,
          total: deleted ? 0 : 1,
        },
        status: 200,
      })
      return
    }

    if (path.endsWith('/images')) {
      await route.fulfill({
        contentType: 'application/json',
        json: deleted ? [] : [imageResponse()],
        status: 200,
      })
      return
    }

    if (path.endsWith('/status')) {
      await route.fulfill({
        contentType: 'application/json',
        json: deleted ? [] : statusHistory,
        status: 200,
      })
      return
    }

    if (deleted) {
      await route.fulfill({
        contentType: 'application/json',
        json: { error_code: 'INFO_NOT_FOUND', message: 'Info not found' },
        status: 404,
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      json: storedInfo,
      status: 200,
    })
  })

  return requests
}

function readMultipartValue(body: string, fieldName: string): string {
  const pattern = new RegExp(
    `name="${fieldName}"\\r?\\n\\r?\\n([^\\r\\n]+)`,
  )
  return pattern.exec(body)?.[1] ?? ''
}

function readMultipartFilename(body: string): string | null {
  return /filename="([^"]+)"/.exec(body)?.[1] ?? null
}

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze()
  expect(
    result.violations.filter((violation) =>
      violation.impact === 'critical' || violation.impact === 'serious',
    ),
  ).toEqual([])
}
