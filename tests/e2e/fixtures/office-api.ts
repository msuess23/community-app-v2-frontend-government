import type { Page } from '@playwright/test'

export const ADMIN_ID = '00000000-0000-4000-8000-000000000001'
export const OFFICE_ID = '00000000-0000-4000-8000-000000000010'
export const CREATED_OFFICE_ID = '00000000-0000-4000-8000-000000000011'
const ADDRESS_ID = '00000000-0000-4000-8000-000000000020'
const HISTORY_ID = '00000000-0000-4000-8000-000000000030'

type JsonObject = Record<string, unknown>

type OfficeApiHarness = Readonly<{
  createRequests: JsonObject[]
  deactivateRequests: JsonObject[]
  listSorts: Array<Readonly<{ order: string; sortBy: string }>>
  listStatuses: string[]
  updateRequests: JsonObject[]
}>

/** Provides one stateful browser-side Office API for the complete E2E workflow. */
export async function installOfficeApi(page: Page): Promise<OfficeApiHarness> {
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
    contact_email: 'ordnung@example.com',
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
