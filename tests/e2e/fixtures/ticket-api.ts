import type { Page } from '@playwright/test'

export const TICKET_ID = '00000000-0000-4000-8000-000000000100'
export const SECOND_TICKET_ID = '00000000-0000-4000-8000-000000000101'
export const TICKET_OFFICE_ID = '00000000-0000-4000-8000-000000000010'

/** Installs the read-only ticket and office endpoints used by the first workspace patch. */
export async function installTicketReadApi(page: Page): Promise<string[]> {
  const listRequests: string[] = []

  await page.route('**/api/v1/offices**', async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname === '/api/v1/offices') {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          data: [officeResponse()],
          page: 1,
          pages: 1,
          size: 20,
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

  await page.route('**/api/v1/tickets**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (path === '/api/v1/tickets/internal') {
      listRequests.push(url.searchParams.toString())
      await route.fulfill({
        contentType: 'application/json',
        json: {
          data: [ticketResponse(), secondTicketResponse()],
          page: 1,
          pages: 1,
          size: Number(url.searchParams.get('size') ?? 20),
          total: 2,
        },
        status: 200,
      })
      return
    }

    if (path === `/api/v1/tickets/${TICKET_ID}/internal`) {
      await route.fulfill({
        contentType: 'application/json',
        json: { ...ticketResponse(), allowed_actions: ['FORWARD', 'COMPLETE'] },
        status: 200,
      })
      return
    }

    if (path === `/api/v1/tickets/${SECOND_TICKET_ID}/internal`) {
      await route.fulfill({
        contentType: 'application/json',
        json: { ...secondTicketResponse(), allowed_actions: [] },
        status: 200,
      })
      return
    }

    await route.fulfill({ status: 404 })
  })

  return listRequests
}

function ticketResponse() {
  return {
    address: {
      city: 'Leipzig',
      house_number: '18',
      id: 'address-1',
      latitude: 51.34,
      longitude: 12.37,
      street: 'Parkstraße',
      zip_code: '04109',
    },
    category: 'INFRASTRUCTURE',
    created_at: '2026-08-01T08:00:00Z',
    creator: { display_name: 'Clara Bürgerin', id: 'citizen-1' },
    creator_user_id: 'citizen-1',
    current_assignee: { display_name: 'Olaf Ordnung', id: 'officer-1' },
    current_assignee_id: 'officer-1',
    current_status: {
      created_at: '2026-08-02T08:00:00Z',
      id: 'status-1',
      message: 'Die Bearbeitung wurde aufgenommen.',
      status: 'IN_PROGRESS',
    },
    description: 'Ein tiefes Schlagloch befindet sich am rechten Fahrbahnrand.',
    id: TICKET_ID,
    image_url: null,
    office: { id: TICKET_OFFICE_ID, name: 'Tiefbauamt' },
    office_id: TICKET_OFFICE_ID,
    primary_officer: { display_name: 'Paula Primär', id: 'officer-2' },
    primary_officer_id: 'officer-2',
    return_to_user: null,
    return_to_user_id: null,
    title: 'Schlagloch in der Parkstraße',
    updated_at: '2026-08-02T09:30:00Z',
    version: 4,
    visibility: 'PUBLIC',
    workflow_state: 'IN_PROGRESS',
  }
}

function secondTicketResponse() {
  return {
    ...ticketResponse(),
    address: null,
    category: 'CLEANING',
    current_assignee: null,
    current_assignee_id: null,
    current_status: {
      created_at: '2026-08-03T08:00:00Z',
      id: 'status-2',
      message: null,
      status: 'OPEN',
    },
    description: 'Mehrere Müllsäcke wurden neben dem Container abgestellt.',
    id: SECOND_TICKET_ID,
    office: null,
    office_id: null,
    primary_officer: null,
    primary_officer_id: null,
    title: 'Illegale Müllablagerung',
    updated_at: '2026-08-03T08:00:00Z',
    version: 1,
    visibility: 'PRIVATE',
    workflow_state: 'NEW',
  }
}

function officeResponse() {
  return {
    address: null,
    contact_email: 'tiefbau@example.test',
    description: null,
    id: TICKET_OFFICE_ID,
    metadata: {
      created_at: '2026-01-01T08:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    name: 'Tiefbauamt',
    opening_hours: null,
    phone: null,
    services: [],
  }
}
