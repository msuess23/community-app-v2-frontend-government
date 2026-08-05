import type { Page } from '@playwright/test'

export const TICKET_ID = '00000000-0000-4000-8000-000000000100'
export const SECOND_TICKET_ID = '00000000-0000-4000-8000-000000000101'
export const TICKET_OFFICE_ID = '00000000-0000-4000-8000-000000000010'

export type TicketApiRequestLog = Readonly<{
  listRequests: string[]
  workflowRequests: unknown[]
}>

/** Installs stateful ticket read and workflow endpoints used by workspace E2E tests. */
export async function installTicketReadApi(
  page: Page,
): Promise<TicketApiRequestLog> {
  const listRequests: string[] = []
  const workflowRequests: unknown[] = []
  let currentTicket = {
    ...ticketResponse(),
    allowed_actions: ['FORWARD', 'COMPLETE'],
  }

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

    if (
      path === `/api/v1/tickets/${TICKET_ID}/workflow-options` &&
      request.method() === 'GET'
    ) {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          completion_outcomes: ['RESOLVED'],
          cosignature_targets: [],
          escalation_targets: [],
          forward_targets: [
            {
              display_name: 'Erika Einsatz',
              id: 'officer-3',
              office: { id: 'office-2', name: 'Ordnungsamt' },
              role: 'OFFICER',
            },
          ],
          offices: [],
          primary_officers: [],
          ticket_id: TICKET_ID,
          version: currentTicket.version,
        },
        status: 200,
      })
      return
    }

    if (
      path === `/api/v1/tickets/${TICKET_ID}/workflow` &&
      request.method() === 'POST'
    ) {
      const body = request.postDataJSON()
      workflowRequests.push(body)
      currentTicket = {
        ...currentTicket,
        allowed_actions: [],
        current_assignee: { display_name: 'Erika Einsatz', id: 'officer-3' },
        current_assignee_id: 'officer-3',
        updated_at: '2026-08-04T10:00:00Z',
        version: currentTicket.version + 1,
      }
      await route.fulfill({
        contentType: 'application/json',
        json: currentTicket,
        status: 200,
      })
      return
    }

    if (path === `/api/v1/tickets/${TICKET_ID}/events`) {
      await route.fulfill({
        contentType: 'application/json',
        json: ticketEventsResponse(),
        status: 200,
      })
      return
    }

    if (path === `/api/v1/tickets/${TICKET_ID}/comments`) {
      await route.fulfill({
        contentType: 'application/json',
        json: ticketCommentsResponse(),
        status: 200,
      })
      return
    }

    if (path === `/api/v1/tickets/${TICKET_ID}/images`) {
      await route.fulfill({
        contentType: 'application/json',
        json: ticketImagesResponse(),
        status: 200,
      })
      return
    }

    if (
      path.includes(`/api/v1/tickets/${TICKET_ID}/images/`) &&
      path.endsWith('/content')
    ) {
      await route.fulfill({
        body:
          '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#ddd"/><circle cx="320" cy="180" r="80" fill="#999"/></svg>',
        contentType: 'image/svg+xml',
        status: 200,
      })
      return
    }

    if (path === `/api/v1/tickets/${TICKET_ID}/internal`) {
      await route.fulfill({
        contentType: 'application/json',
        json: currentTicket,
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

  return { listRequests, workflowRequests }
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

function ticketEventsResponse() {
  return {
    data: [
      {
        actor: { display_name: 'Clara Bürgerin', id: 'citizen-1' },
        actor_user_id: 'citizen-1',
        event_type: 'TICKET_SUBMITTED',
        id: 'event-1',
        occurred_at: '2026-08-01T08:00:00Z',
        payload: {
          category: 'INFRASTRUCTURE',
          creator_user_id: 'citizen-1',
          description:
            'Ein tiefes Schlagloch befindet sich am rechten Fahrbahnrand.',
          title: 'Schlagloch in der Parkstraße',
          visibility: 'PUBLIC',
        },
        references: { offices: [], users: [] },
        sequence_number: 1,
        ticket_id: TICKET_ID,
      },
      {
        actor: { display_name: 'Olaf Ordnung', id: 'officer-1' },
        actor_user_id: 'officer-1',
        event_type: 'TICKET_FORWARDED',
        id: 'event-2',
        occurred_at: '2026-08-02T09:30:00Z',
        payload: {
          comment: 'Bitte die Straßensperrung koordinieren.',
          target_user_id: 'officer-3',
        },
        references: {
          offices: [],
          users: [
            { display_name: 'Erika Einsatz', id: 'officer-3' },
          ],
        },
        sequence_number: 2,
        ticket_id: TICKET_ID,
      },
    ],
    page: 1,
    pages: 1,
    size: 20,
    total: 2,
  }
}

function ticketCommentsResponse() {
  return [
    {
      author: {
        author_type: 'AUTHORITY',
        display_name: 'Olaf Ordnung',
        id: 'officer-1',
      },
      created_at: '2026-08-02T10:00:00Z',
      id: 'comment-1',
      is_internal: true,
      text: 'Interne fachliche Prüfung läuft.',
      ticket_id: TICKET_ID,
    },
    {
      author: {
        author_type: 'CITIZEN',
        display_name: 'Clara Bürgerin',
        id: null,
      },
      created_at: '2026-08-03T10:00:00Z',
      id: 'comment-2',
      is_internal: false,
      text: 'Das Foto wurde am Montag aufgenommen.',
      ticket_id: TICKET_ID,
    },
  ]
}

function ticketImagesResponse() {
  return [
    {
      height: 360,
      id: 'image-active',
      is_active: true,
      is_cover: true,
      mime_type: 'image/jpeg',
      original_filename: 'schlagloch-aktuell.jpg',
      removed_at: null,
      size_bytes: 1200,
      ticket_id: TICKET_ID,
      uploaded_at: '2026-08-02T08:00:00Z',
      url: `/api/v1/tickets/${TICKET_ID}/images/image-active/content`,
      width: 640,
    },
    {
      height: 360,
      id: 'image-removed',
      is_active: false,
      is_cover: false,
      mime_type: 'image/jpeg',
      original_filename: 'schlagloch-alt.jpg',
      removed_at: '2026-08-03T08:00:00Z',
      size_bytes: 1100,
      ticket_id: TICKET_ID,
      uploaded_at: '2026-08-01T08:00:00Z',
      url: `/api/v1/tickets/${TICKET_ID}/images/image-removed/content`,
      width: 640,
    },
  ]
}
