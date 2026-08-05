import type { Page } from '@playwright/test'

import type {
  TicketCommentResponse,
  TicketEventType,
  TicketImageResponse,
  TicketInternalDetailResponse,
  TicketWorkflowOptionsResponse,
} from '../../../src/api/generated/models'

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
} from './ticket-api-data'

export { SECOND_TICKET_ID, TICKET_ID, TICKET_OFFICE_ID } from './ticket-api-data'

export type TicketApiRequestLog = Readonly<{
  commentRequests: unknown[]
  imageCoverRequests: string[]
  imageRemovalRequests: unknown[]
  imageUploadNames: string[]
  imageListRequests: string[]
  listRequests: string[]
  workflowRequests: unknown[]
}>

export type TicketApiScenario = Readonly<{
  events?: readonly TicketEventFixture[]
  ticket?: Partial<TicketInternalDetailResponse>
  workflowOptions?: Partial<TicketWorkflowOptionsResponse>
}>

/** Installs stateful ticket read, workflow and collaboration endpoints for E2E tests. */
export async function installTicketReadApi(
  page: Page,
  scenario: TicketApiScenario = {},
): Promise<TicketApiRequestLog> {
  const commentRequests: unknown[] = []
  const imageCoverRequests: string[] = []
  const imageRemovalRequests: unknown[] = []
  const imageUploadNames: string[] = []
  const imageListRequests: string[] = []
  const listRequests: string[] = []
  const workflowRequests: unknown[] = []
  let currentTicket: TicketInternalDetailResponse = {
    ...ticketResponse(),
    ...scenario.ticket,
  }
  let comments = ticketCommentsResponse()
  let images = ticketImagesResponse()
  let events = [...(scenario.events ?? initialTicketEvents())]

  function appendEvent(
    eventType: TicketEventType,
    payload: Record<string, unknown>,
  ) {
    const sequenceNumber = events.length + 1
    events = [
      ...events,
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
        const comment: TicketCommentResponse = {
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

    if (path === `/api/v1/tickets/${TICKET_ID}/images`) {
      if (request.method() === 'GET') {
        imageListRequests.push(url.searchParams.toString())
        const includeRemoved =
          url.searchParams.get('include_removed') === 'true'
        await route.fulfill({
          contentType: 'application/json',
          json: includeRemoved
            ? images
            : images.filter((image) => image.is_active),
          status: 200,
        })
        return
      }

      if (request.method() === 'POST') {
        const multipartBody = request.postData() ?? ''
        const filename =
          multipartBody.match(/filename="([^"]+)"/)?.[1] ??
          `ticket-upload-${imageUploadNames.length + 1}.jpg`
        imageUploadNames.push(filename)
        const imageId = `image-upload-${imageUploadNames.length}`
        const image: TicketImageResponse = {
          height: 360,
          id: imageId,
          is_active: true,
          is_cover: images.every((item) => !item.is_active),
          mime_type: filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
          original_filename: filename,
          removed_at: null,
          size_bytes: 1200,
          ticket_id: TICKET_ID,
          uploaded_at: '2026-08-05T07:00:00Z',
          url: `/api/v1/tickets/${TICKET_ID}/images/${imageId}/content`,
          width: 640,
        }
        images = [...images, image]
        appendEvent('TICKET_IMAGE_ADDED', {
          height: image.height,
          image_id: image.id,
          is_cover: image.is_cover,
          mime_type: image.mime_type,
          original_filename: image.original_filename,
          size_bytes: image.size_bytes,
          storage_key: `ticket/${TICKET_ID}/${image.id}`,
          width: image.width,
        })
        await route.fulfill({
          contentType: 'application/json',
          json: image,
          status: 200,
        })
        return
      }
    }

    const coverMatch = path.match(
      new RegExp(`^/api/v1/tickets/${TICKET_ID}/images/([^/]+)/cover$`),
    )
    if (coverMatch && request.method() === 'PUT') {
      const imageId = coverMatch[1]
      imageCoverRequests.push(imageId)
      images = images.map((image) => ({
        ...image,
        is_cover: image.id === imageId,
      }))
      appendEvent('TICKET_COVER_IMAGE_CHANGED', { image_id: imageId })
      await route.fulfill({
        contentType: 'application/json',
        json: images.find((image) => image.id === imageId),
        status: 200,
      })
      return
    }

    const imageMatch = path.match(
      new RegExp(`^/api/v1/tickets/${TICKET_ID}/images/([^/]+)$`),
    )
    if (imageMatch && request.method() === 'DELETE') {
      const imageId = imageMatch[1]
      const body = request.postDataJSON() as { reason?: string | null }
      imageRemovalRequests.push({ imageId, ...body })
      const removedWasCover = images.some(
        (image) => image.id === imageId && image.is_cover,
      )
      images = images.map((image) =>
        image.id === imageId
          ? {
              ...image,
              is_active: false,
              is_cover: false,
              removed_at: '2026-08-05T07:00:00Z',
            }
          : image,
      )
      appendEvent('TICKET_IMAGE_REMOVED', {
        image_id: imageId,
        reason: body.reason ?? null,
      })
      if (removedWasCover) {
        const replacement = images.find((image) => image.is_active)
        if (replacement) {
          images = images.map((image) => ({
            ...image,
            is_cover: image.id === replacement.id,
          }))
          appendEvent('TICKET_COVER_IMAGE_CHANGED', {
            image_id: replacement.id,
          })
        }
      }
      await route.fulfill({ status: 204 })
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
    imageCoverRequests,
    imageRemovalRequests,
    imageUploadNames,
    imageListRequests,
    listRequests,
    workflowRequests,
  }
}
