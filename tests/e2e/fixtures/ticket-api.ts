import type { Page } from '@playwright/test'

export const TICKET_ID = '00000000-0000-4000-8000-000000000100'
export const SECOND_TICKET_ID = '00000000-0000-4000-8000-000000000101'
export const TICKET_OFFICE_ID = '00000000-0000-4000-8000-000000000010'

export type TicketApiRequestLog = Readonly<{
  commentRequests: unknown[]
  imageCoverRequests: string[]
  imageRemovalRequests: unknown[]
  imageUploadNames: string[]
  listRequests: string[]
  workflowRequests: unknown[]
}>

type TicketEventFixture = Readonly<{
  actor: Readonly<{ display_name: string; id: string }> | null
  actor_user_id: string | null
  event_type: string
  id: string
  occurred_at: string
  payload: Readonly<Record<string, unknown>>
  references: Readonly<{
    offices: readonly Readonly<{ id: string; name: string }>[]
    users: readonly Readonly<{ display_name: string; id: string }>[]
  }>
  sequence_number: number
  ticket_id: string
}>

/** Installs stateful ticket read, workflow and collaboration endpoints for E2E tests. */
export async function installTicketReadApi(
  page: Page,
): Promise<TicketApiRequestLog> {
  const commentRequests: unknown[] = []
  const imageCoverRequests: string[] = []
  const imageRemovalRequests: unknown[] = []
  const imageUploadNames: string[] = []
  const listRequests: string[] = []
  const workflowRequests: unknown[] = []
  let currentTicket = {
    ...ticketResponse(),
    allowed_actions: ['FORWARD', 'COMPLETE'],
  }
  let comments = ticketCommentsResponse()
  let images = ticketImagesResponse()
  let events = initialTicketEvents()

  function appendEvent(eventType: string, payload: Record<string, unknown>) {
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
        const comment = {
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
        const image = {
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
    listRequests,
    workflowRequests,
  }
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
    can_manage_images: true,
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
    can_manage_images: false,
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

function initialTicketEvents(): TicketEventFixture[] {
  return [
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
        users: [{ display_name: 'Erika Einsatz', id: 'officer-3' }],
      },
      sequence_number: 2,
      ticket_id: TICKET_ID,
    },
  ]
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
      id: 'image-secondary',
      is_active: true,
      is_cover: false,
      mime_type: 'image/jpeg',
      original_filename: 'schlagloch-detail.jpg',
      removed_at: null,
      size_bytes: 1150,
      ticket_id: TICKET_ID,
      uploaded_at: '2026-08-02T08:10:00Z',
      url: `/api/v1/tickets/${TICKET_ID}/images/image-secondary/content`,
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
