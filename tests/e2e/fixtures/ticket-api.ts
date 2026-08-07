import type { Page } from '@playwright/test'

import type {
  TicketCommentFixture,
  TicketImageFixture,
  TicketInternalDetailFixture,
  TicketWorkflowOptionsFixture,
} from './ticket-api-data.js'

import {
  initialTicketEvents,
  officeResponse,
  SECOND_TICKET_ID,
  secondTicketResponse,
  TICKET_ID,
  ticketCommentsResponse,
  ticketImagesResponse,
  ticketResponse,
  ticketWorkflowOptionsResponse,
  type TicketEventFixture,
} from './ticket-api-data.js'

export {
  SECOND_TICKET_ID,
  TICKET_ID,
  TICKET_OFFICE_ID,
} from './ticket-api-data.js'

export type TicketApiRequestLog = Readonly<{
  commentRequests: unknown[]
  dispatchRequests: unknown[]
  imageListRequests: string[]
  listRequests: string[]
  workflowRequests: unknown[]
}>

export type TicketApiScenario = Readonly<{
  events?: readonly TicketEventFixture[]
  ticket?: Partial<TicketInternalDetailFixture>
  workflowOptions?: Partial<TicketWorkflowOptionsFixture>
}>

/** Installs stateful ticket read, workflow and collaboration endpoints for E2E tests. */
export async function installTicketReadApi(
  page: Page,
  scenario: TicketApiScenario = {},
): Promise<TicketApiRequestLog> {
  const commentRequests: unknown[] = []
  const dispatchRequests: unknown[] = []
  const imageListRequests: string[] = []
  const listRequests: string[] = []
  const workflowRequests: unknown[] = []
  let currentTicket: TicketInternalDetailFixture = {
    ...ticketResponse(),
    ...scenario.ticket,
  }
  let comments = ticketCommentsResponse()
  const images = ticketImagesResponse()
  let events = [...(scenario.events ?? initialTicketEvents())].sort(
    (left, right) => right.sequence_number - left.sequence_number,
  )

  function appendEvent(
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    const sequenceNumber = events.length + 1
    events = [
      {
        actor: { display_name: 'Olaf Ordnung', id: 'officer-1' },
        actor_user_id: 'officer-1',
        event_type: eventType,
        id: `event-${sequenceNumber}`,
        occurred_at: '2026-08-05T07:00:00Z',
        payload,
        references: { offices: [], users: [] },
        sequence_number: sequenceNumber,
        ticket_id: TICKET_ID,
      },
      ...events,
    ]
    currentTicket = {
      ...currentTicket,
      updated_at: '2026-08-05T07:00:00Z',
      version: currentTicket.version + 1,
    }
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
          data: [currentTicket, secondTicketResponse()],
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
          ...ticketWorkflowOptionsResponse(),
          ...scenario.workflowOptions,
          version: currentTicket.version,
        },
        status: 200,
      })
      return
    }

    if (
      path === `/api/v1/tickets/${TICKET_ID}/dispatch` &&
      request.method() === 'POST'
    ) {
      const body = request.postDataJSON() as {
        comment?: string | null
        office_id: string
      }
      dispatchRequests.push(body)
      appendEvent('TICKET_DISPATCHED', {
        comment: body.comment ?? null,
        office_id: body.office_id,
      })
      currentTicket = {
        ...currentTicket,
        allowed_actions: [],
        current_status: {
          created_at: '2026-08-05T07:00:00Z',
          id: 'status-dispatched',
          message: 'An die zuständige Behörde weitergeleitet.',
          status: 'IN_PROGRESS',
        },
        office: { id: body.office_id, name: 'Tiefbauamt' },
        office_id: body.office_id,
        workflow_state: 'AWAITING_PRIMARY_ASSIGNMENT',
      }
      await route.fulfill({
        contentType: 'application/json',
        json: currentTicket,
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

    if (
      path === `/api/v1/tickets/${TICKET_ID}/events` &&
      request.method() === 'GET'
    ) {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          data: events,
          page: 1,
          pages: 1,
          size: 20,
          total: events.length,
        },
        status: 200,
      })
      return
    }

    if (path === `/api/v1/tickets/${TICKET_ID}/comments`) {
      if (request.method() === 'GET') {
        await route.fulfill({
          contentType: 'application/json',
          json: comments,
          status: 200,
        })
        return
      }

      if (request.method() === 'POST') {
        const body = request.postDataJSON() as {
          is_internal?: boolean
          text: string
        }
        commentRequests.push(body)
        const comment: TicketCommentFixture = {
          author: {
            author_type: 'AUTHORITY',
            display_name: 'Olaf Ordnung',
            id: 'officer-1',
          },
          created_at: '2026-08-05T07:00:00Z',
          id: `comment-${comments.length + 1}`,
          is_internal: body.is_internal ?? false,
          text: body.text,
          ticket_id: TICKET_ID,
        }
        comments = [...comments, comment]
        appendEvent('TICKET_COMMENTED', {
          is_internal: comment.is_internal,
          text: comment.text,
        })
        await route.fulfill({
          contentType: 'application/json',
          json: comment,
          status: 200,
        })
        return
      }
    }

    if (
      path === `/api/v1/tickets/${TICKET_ID}/images` &&
      request.method() === 'GET'
    ) {
      imageListRequests.push(url.searchParams.toString())
      const includeRemoved =
        url.searchParams.get('include_removed') === 'true'
      await route.fulfill({
        contentType: 'application/json',
        json: includeRemoved
          ? images
          : images.filter((image: TicketImageFixture) => image.is_active),
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

  return {
    commentRequests,
    dispatchRequests,
    imageListRequests,
    listRequests,
    workflowRequests,
  }
}
