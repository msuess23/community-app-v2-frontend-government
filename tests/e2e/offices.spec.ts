import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import {
  signInAsAuthorityUser,
  type AuthorityUserFixture,
} from './fixtures/auth.js'

const ADMIN_ID = '00000000-0000-4000-8000-000000000001'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'
const CREATED_OFFICE_ID = '00000000-0000-4000-8000-000000000011'
const ADDRESS_ID = '00000000-0000-4000-8000-000000000020'
const HISTORY_ID = '00000000-0000-4000-8000-000000000030'

const officerUser: AuthorityUserFixture = {
  email: 'officer@example.test',
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
      page.getByRole('link', { name: 'ordnung@example.test' }),
    ).toHaveAttribute('href', 'mailto:ordnung@example.test')
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
      .fill('sued@example.test')
    await page.getByRole('button', { name: 'Leistung hinzufügen' }).click()
    await page
      .getByRole('textbox', { name: 'Leistung 1' })
      .fill('Meldebescheinigungen')
    await page
      .getByRole('combobox', { name: 'Status am Montag' })
      .selectOption('open')
    await page.getByLabel('Startzeit, Intervall 1').fill('08:00')
    await page.getByLabel('Endzeit, Intervall 1').fill('12:00')
    await page
      .getByRole('checkbox', { name: 'Postadresse hinterlegen' })
      .check()
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
        contact_email: 'sued@example.test',
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
          email: 'admin@example.test',
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

type JsonObject = Record<string, unknown>

type OfficeApiHarness = Readonly<{
  createRequests: JsonObject[]
  deactivateRequests: JsonObject[]
  listSorts: Array<Readonly<{ order: string; sortBy: string }>>
  listStatuses: string[]
  updateRequests: JsonObject[]
}>

/** Provides one stateful browser-side Office API for the complete E2E workflow. */
async function installOfficeApi(page: Page): Promise<OfficeApiHarness> {
  const createRequests: JsonObject[] = []
  const deactivateRequests: JsonObject[] = []
  const listSorts: Array<Readonly<{ order: string; sortBy: string }>> = []
  const listStatuses: string[] = []
  const updateRequests: JsonObject[] = []
  let office = createOfficeResponse()
  let lastChangeReason = 'Behörde angelegt'

  await page.route('**/api/v1/offices**', async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    const path = url.pathname

    if (method === 'GET' && path === '/api/v1/offices') {
      const status = url.searchParams.get('status') ?? 'active'
      listStatuses.push(status)
      listSorts.push({
        order: url.searchParams.get('order') ?? '',
        sortBy: url.searchParams.get('sort_by') ?? '',
      })
      const visible =
        status === 'all' ||
        (status === 'active' && office.metadata.is_active) ||
        (status === 'inactive' && !office.metadata.is_active)
      const data = visible ? [office] : []

      await route.fulfill({
        contentType: 'application/json',
        json: {
          data,
          page: 1,
          pages: 1,
          size: Number(url.searchParams.get('size') ?? 20),
          total: data.length,
        },
        status: 200,
      })
      return
    }

    if (method === 'POST' && path === '/api/v1/offices') {
      const body = (await request.postDataJSON()) as JsonObject
      createRequests.push(body)
      office = createOfficeFromRequest(body)
      lastChangeReason = 'Behörde angelegt'
      await route.fulfill({
        contentType: 'application/json',
        json: office,
        status: 201,
      })
      return
    }

    if (method === 'GET' && path.endsWith('/history')) {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          data: [createHistoryResponse(office, lastChangeReason)],
          page: 1,
          pages: 1,
          size: Number(url.searchParams.get('size') ?? 20),
          total: 1,
        },
        status: 200,
      })
      return
    }

    if (method === 'GET' && path.startsWith('/api/v1/offices/')) {
      await route.fulfill({
        contentType: 'application/json',
        json: office,
        status: 200,
      })
      return
    }

    if (method === 'PATCH' && path.startsWith('/api/v1/offices/')) {
      const body = (await request.postDataJSON()) as JsonObject
      updateRequests.push(body)
      office = updateOfficeFromRequest(office, body)
      lastChangeReason = readString(body.change_reason) ?? 'Behörde geändert'
      await route.fulfill({
        contentType: 'application/json',
        json: office,
        status: 200,
      })
      return
    }

    if (method === 'DELETE' && path.startsWith('/api/v1/offices/')) {
      const body = (await request.postDataJSON()) as JsonObject
      deactivateRequests.push(body)
      lastChangeReason =
        readString(body.change_reason) ?? 'Behörde deaktiviert'
      office = {
        ...office,
        metadata: {
          ...office.metadata,
          deactivated_at: '2026-08-04T00:30:00Z',
          is_active: false,
        },
      }
      await route.fulfill({ status: 204 })
      return
    }

    await route.fallback()
  })

  return {
    createRequests,
    deactivateRequests,
    listSorts,
    listStatuses,
    updateRequests,
  }
}

interface OfficeResponseFixture {
  address: AddressResponseFixture | null
  contact_email: string | null
  description: string | null
  id: string
  metadata: {
    created_at: string
    deactivated_at: string | null
    is_active: boolean
  }
  name: string
  opening_hours: Record<string, string | null> | null
  phone: string | null
  services: string[]
}

interface AddressResponseFixture {
  city: string
  house_number: string
  id: string
  latitude: number | null
  longitude: number | null
  street: string
  zip_code: string
}

/** Creates the active OfficeResponse used by read and lifecycle scenarios. */
function createOfficeResponse(): OfficeResponseFixture {
  return {
    address: {
      city: 'Leipzig',
      house_number: '12a',
      id: ADDRESS_ID,
      latitude: 51.3397,
      longitude: 12.3731,
      street: 'Musterstraße',
      zip_code: '04109',
    },
    contact_email: 'ordnung@example.test',
    description: 'Zentrale Anlaufstelle für kommunale Anliegen.',
    id: OFFICE_ID,
    metadata: {
      created_at: '2026-08-01T10:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    name: 'Ordnungsamt',
    opening_hours: {
      monday: '08:00-12:00, 13:00-16:00',
      saturday: 'geschlossen',
    },
    phone: '+49 341 123456',
    services: ['Fundbüro', 'Gewerbeangelegenheiten'],
  }
}

/** Produces the authoritative POST response from the submitted create payload. */
function createOfficeFromRequest(body: JsonObject): OfficeResponseFixture {
  return {
    address: readAddress(body.address),
    contact_email: readNullableString(body.contact_email),
    description: readNullableString(body.description),
    id: CREATED_OFFICE_ID,
    metadata: {
      created_at: '2026-08-04T00:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    name: readString(body.name) ?? 'Neue Behörde',
    opening_hours: readOpeningHours(body.opening_hours),
    phone: readNullableString(body.phone),
    services: readStringArray(body.services),
  }
}

/** Applies the partial PATCH fields used by the edit browser scenario. */
function updateOfficeFromRequest(
  current: OfficeResponseFixture,
  body: JsonObject,
): OfficeResponseFixture {
  return {
    ...current,
    contact_email:
      'contact_email' in body
        ? readNullableString(body.contact_email)
        : current.contact_email,
    description:
      'description' in body
        ? readNullableString(body.description)
        : current.description,
    name: 'name' in body ? readString(body.name) ?? current.name : current.name,
    phone: 'phone' in body ? readNullableString(body.phone) : current.phone,
    services:
      'services' in body ? readStringArray(body.services) : current.services,
  }
}

/** Serializes the current result state as one immutable backend history snapshot. */
function createHistoryResponse(
  office: OfficeResponseFixture,
  changeReason: string,
): JsonObject {
  return {
    address_snapshot: office.address
      ? {
          city: office.address.city,
          formatted:
            `${office.address.street} ${office.address.house_number}, ` +
            `${office.address.zip_code} ${office.address.city}`,
          house_number: office.address.house_number,
          latitude: office.address.latitude,
          longitude: office.address.longitude,
          street: office.address.street,
          zip_code: office.address.zip_code,
        }
      : null,
    change_reason: changeReason,
    changed_at: '2026-08-04T00:30:00Z',
    changed_by_user_id: ADMIN_ID,
    contact_email: office.contact_email,
    description: office.description,
    id: HISTORY_ID,
    is_active: office.metadata.is_active,
    name: office.name,
    office_id: office.id,
    opening_hours: office.opening_hours ?? {},
    phone: office.phone,
    services: office.services,
  }
}

/** Parses the optional address object without widening the E2E fixture contract. */
function readAddress(value: unknown): AddressResponseFixture | null {
  if (!isJsonObject(value)) {
    return null
  }

  return {
    city: readString(value.city) ?? '',
    house_number: readString(value.house_number) ?? '',
    id: ADDRESS_ID,
    latitude: null,
    longitude: null,
    street: readString(value.street) ?? '',
    zip_code: readString(value.zip_code) ?? '',
  }
}

function readOpeningHours(
  value: unknown,
): Record<string, string | null> | null {
  if (value === null) {
    return null
  }
  if (!isJsonObject(value)) {
    return null
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string | null] =>
        typeof entry[1] === 'string' || entry[1] === null,
    ),
  )
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function readNullableString(value: unknown): string | null {
  return value === null ? null : readString(value)
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Fails when the rendered office workflow contains serious WCAG violations. */
async function expectNoSeriousAccessibilityViolations(
  page: Page,
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
