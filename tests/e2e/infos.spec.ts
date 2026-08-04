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
    await page
      .getByRole('combobox', { name: 'Sortierung' })
      .selectOption('updatedAt:desc')

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
    await page.getByLabel(/Beginn/).fill('2026-08-12T17:00')
    await page.getByLabel(/Ende/).fill('2026-08-12T20:00')
    await page.getByRole('checkbox', { name: 'Adresse hinterlegen' }).check()
    await page.getByRole('textbox', { name: /Straße/ }).fill('Markt')
    await page.getByRole('textbox', { name: /Hausnummer/ }).fill('1')
    await page.getByRole('textbox', { name: /Postleitzahl/ }).fill('04109')
    await page.getByRole('textbox', { name: /Ort/ }).fill('Leipzig')

    await expectNoSeriousAccessibilityViolations(page)
    await page.getByRole('button', { name: 'Mitteilung anlegen' }).click()

    await expect(page).toHaveURL(new RegExp(`/infos/${INFO_ID}$`))
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Straßensperrung Innenstadt',
      }),
    ).toBeVisible()

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

function imageResponse() {
  return {
    alt_text: 'Bühne und Informationsstände auf dem Leipziger Markt',
    height: 1,
    id: IMAGE_ID,
    info_id: INFO_ID,
    is_cover: true,
    mime_type: 'image/png',
    original_filename: 'markt.png',
    size_bytes: 68,
    uploaded_at: '2026-08-01T08:00:00Z',
    url: `/api/v1/infos/${INFO_ID}/images/${IMAGE_ID}/content`,
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
  update: unknown
}> {
  const requests: { create: unknown; update: unknown } = {
    create: null,
    update: null,
  }
  let storedInfo: Record<string, unknown> = infoResponse()

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
        json: [],
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

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze()
  expect(
    result.violations.filter((violation) =>
      violation.impact === 'critical' || violation.impact === 'serious',
    ),
  ).toEqual([])
}
