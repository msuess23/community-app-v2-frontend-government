import type { Page, Route } from '@playwright/test'

import {
  APPOINTMENT_CITIZEN_ID,
  APPOINTMENT_DOCUMENT_GROUP_ID,
  APPOINTMENT_DOCUMENT_VERSION_ID,
  APPOINTMENT_ID,
  APPOINTMENT_OFFICE_ID,
  APPOINTMENT_TICKET_ID,
  appointmentDocumentResponse,
  appointmentResponse,
  appointmentSlotResponse,
  type AppointmentFixture,
  expiredAppointmentSlotResponse,
  RESCHEDULE_APPOINTMENT_SLOT_ID,
  rescheduleAppointmentSlotResponse,
  secondAppointmentResponse,
} from './appointment-api-data.js'

export type AppointmentLifecycleRequest = Readonly<{
  action: 'CANCEL' | 'COMPLETE' | 'MARK_NO_SHOW' | 'RESCHEDULE'
  body: unknown
}>

export type AppointmentReadApi = Readonly<{
  documentDownloads: string[]
  documentUploads: Array<Readonly<Record<string, string>>>
  eventPageRequests: number[]
  lifecycleRequests: AppointmentLifecycleRequest[]
  listRequests: string[]
}>

export type AppointmentReadApiOptions = Readonly<{
  eventHistory?: 'default' | 'paginated-with-unknown'
  initialAppointment?: AppointmentFixture
}>

type AppointmentEventFixture = Readonly<{
  actor: Readonly<{ display_name: string; id: string }> | null
  actor_user_id: string | null
  event_type: string
  id: string
  occurred_at: string
  payload: Readonly<Record<string, unknown>>
  sequence_number: number
}>

/** Installs mutable appointment, event and document endpoints for browser workflows. */
export async function installAppointmentReadApi(
  page: Page,
  options: AppointmentReadApiOptions = {},
): Promise<AppointmentReadApi> {
  const documentDownloads: string[] = []
  const documentUploads: Array<Readonly<Record<string, string>>> = []
  const eventPageRequests: number[] = []
  const lifecycleRequests: AppointmentLifecycleRequest[] = []
  const listRequests: string[] = []
  let currentAppointment =
    options.initialAppointment ??
    (options.eventHistory === 'paginated-with-unknown'
      ? appointmentResponse({
          updated_at: '2026-08-06T12:00:00Z',
          version: 3,
        })
      : appointmentResponse())
  let currentDocument = appointmentDocumentResponse()
  let documentVersions = [
    currentDocument,
    appointmentDocumentResponse({
      id: '00000000-0000-4000-8000-000000000602',
      is_current: false,
      original_filename: 'terminhinweis-v1.pdf',
      replaced_version_id: null,
      uploaded_at: '2026-08-01T09:00:00Z',
      version_number: 1,
    }),
  ]
  let events = createInitialAppointmentEvents(options.eventHistory)

  await page.route(
    '**/api/v1/appointments/internal/filter-options',
    async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          citizens: [
            { display_name: 'Clara Bürgerin', id: APPOINTMENT_CITIZEN_ID },
          ],
          tickets: [
            {
              can_view: true,
              id: APPOINTMENT_TICKET_ID,
              title: 'Anliegen zur Ummeldung',
            },
          ],
        },
        status: 200,
      })
    },
  )
  await page.route('**/api/v1/appointments/internal?*', async (route) => {
    listRequests.push(new URL(route.request().url()).search)
    await route.fulfill({
      contentType: 'application/json',
      json: {
        data: [currentAppointment, secondAppointmentResponse()],
        page: 1,
        pages: 1,
        size: 20,
        total: 2,
      },
      status: 200,
    })
  })
  await page.route(
    `**/api/v1/appointments/${APPOINTMENT_ID}`,
    async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        json: currentAppointment,
        status: 200,
      })
    },
  )

  await page.route(
    `**/api/v1/appointments/${APPOINTMENT_ID}/documents/${APPOINTMENT_DOCUMENT_GROUP_ID}/versions`,
    async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        json: documentVersions,
        status: 200,
      })
    },
  )
  await page.route(
    `**/api/v1/appointments/${APPOINTMENT_ID}/documents/*/content`,
    async (route) => {
      const versionId = route.request().url().split('/').at(-2) ?? ''
      documentDownloads.push(versionId)
      await route.fulfill({
        body: '%PDF-1.4\n%%EOF',
        contentType: 'application/pdf',
        headers: {
          'Content-Disposition': `attachment; filename="${
            versionId === APPOINTMENT_DOCUMENT_VERSION_ID
              ? currentDocument.original_filename
              : 'terminhinweis-v1.pdf'
          }"`,
        },
        status: 200,
      })
    },
  )
  await page.route(
    `**/api/v1/appointments/${APPOINTMENT_ID}/documents`,
    async (route) => {
      const request = route.request()
      if (request.method() === 'POST') {
        const formData = await request.postDataBuffer()
        const text = formData?.toString('utf8') ?? ''
        const values = {
          documentType: readMultipartValue(text, 'document_type'),
          filename: readMultipartFilename(text, 'file'),
          groupId: readMultipartValue(text, 'replace_document_group_id'),
          visible: readMultipartValue(text, 'visible_to_citizen'),
        }
        documentUploads.push(values)
        const previous = currentDocument
        currentDocument = appointmentDocumentResponse({
          id: '00000000-0000-4000-8000-000000000603',
          original_filename: values.filename || 'terminhinweis-v3.pdf',
          replaced_version_id: previous.id,
          uploaded_at: '2026-08-06T14:00:00Z',
          version_number: previous.version_number + 1,
          visible_to_citizen: values.visible === 'true',
        })
        documentVersions = [
          currentDocument,
          { ...previous, is_current: false },
          ...documentVersions.slice(1),
        ]
        currentAppointment = nextAppointmentVersion(currentAppointment, {
          updated_at: '2026-08-06T14:00:00Z',
        })
        events = prependAppointmentEvent(events, {
          event_type: 'DOCUMENT_VERSION_ADDED',
          occurred_at: '2026-08-06T14:00:00Z',
          payload: {
            document_group_id: currentDocument.document_group_id,
            document_type: currentDocument.document_type,
            document_version_id: currentDocument.id,
            mime_type: currentDocument.mime_type,
            original_filename: currentDocument.original_filename,
            replaced_version_id: currentDocument.replaced_version_id,
            size_bytes: currentDocument.size_bytes,
            version_number: currentDocument.version_number,
            visible_to_citizen: currentDocument.visible_to_citizen,
          },
        })
        await route.fulfill({
          contentType: 'application/json',
          json: currentDocument,
          status: 201,
        })
        return
      }
      await route.fulfill({
        contentType: 'application/json',
        json: [currentDocument],
        status: 200,
      })
    },
  )

  await page.route(
    `**/api/v1/appointments/${APPOINTMENT_ID}/events?*`,
    async (route) => {
      const url = new URL(route.request().url())
      const requestedPage = Number(url.searchParams.get('page') ?? 1)
      const pageSize = options.eventHistory === 'paginated-with-unknown' ? 1 : 20
      const pageCount = Math.max(Math.ceil(events.length / pageSize), 1)
      const start = (requestedPage - 1) * pageSize
      eventPageRequests.push(requestedPage)
      await route.fulfill({
        contentType: 'application/json',
        json: {
          data: events.slice(start, start + pageSize),
          page: requestedPage,
          pages: pageCount,
          size: pageSize,
          total: events.length,
        },
        status: 200,
      })
    },
  )

  await page.route(
    `**/api/v1/appointments/${APPOINTMENT_ID}/reschedule`,
    async (route) => {
      const body = route.request().postDataJSON() as {
        reason: string
        target_slot_id: string
      }
      lifecycleRequests.push({ action: 'RESCHEDULE', body })
      const previousAppointment = currentAppointment
      currentAppointment = nextAppointmentVersion(currentAppointment, {
        allowed_actions: ['RESCHEDULE', 'CANCEL'],
        current_slot_id: body.target_slot_id,
        ends_at: '2099-08-21T10:30:00Z',
        starts_at: '2099-08-21T10:00:00Z',
        updated_at: '2026-08-06T13:00:00Z',
      })
      events = prependAppointmentEvent(events, {
        event_type: 'APPOINTMENT_RESCHEDULED',
        occurred_at: '2026-08-06T13:00:00Z',
        payload: {
          new_ends_at: currentAppointment.ends_at,
          new_slot_id: body.target_slot_id,
          new_starts_at: currentAppointment.starts_at,
          previous_ends_at: previousAppointment.ends_at,
          previous_slot_id: previousAppointment.current_slot_id,
          previous_starts_at: previousAppointment.starts_at,
          reason: body.reason,
        },
      })
      await fulfillAppointmentMutation(route, currentAppointment)
    },
  )

  await page.route(
    `**/api/v1/appointments/${APPOINTMENT_ID}/cancel`,
    async (route) => {
      const body = route.request().postDataJSON() as { reason: string }
      lifecycleRequests.push({ action: 'CANCEL', body })
      const previousSlotId = currentAppointment.current_slot_id
      currentAppointment = nextAppointmentVersion(currentAppointment, {
        allowed_actions: [],
        cancelled_at: '2026-08-06T13:05:00Z',
        current_slot_id: null,
        status: 'CANCELLED',
        updated_at: '2026-08-06T13:05:00Z',
      })
      events = prependAppointmentEvent(events, {
        event_type: 'APPOINTMENT_CANCELLED',
        occurred_at: '2026-08-06T13:05:00Z',
        payload: { reason: body.reason, slot_id: previousSlotId },
      })
      await fulfillAppointmentMutation(route, currentAppointment)
    },
  )

  await page.route(
    `**/api/v1/appointments/${APPOINTMENT_ID}/complete`,
    async (route) => {
      const body = route.request().postDataJSON() as { comment: string | null }
      lifecycleRequests.push({ action: 'COMPLETE', body })
      currentAppointment = nextAppointmentVersion(currentAppointment, {
        allowed_actions: [],
        completed_at: '2026-08-06T13:10:00Z',
        status: 'COMPLETED',
        updated_at: '2026-08-06T13:10:00Z',
      })
      events = prependAppointmentEvent(events, {
        event_type: 'APPOINTMENT_COMPLETED',
        occurred_at: '2026-08-06T13:10:00Z',
        payload: { comment: body.comment },
      })
      await fulfillAppointmentMutation(route, currentAppointment)
    },
  )

  await page.route(
    `**/api/v1/appointments/${APPOINTMENT_ID}/no-show`,
    async (route) => {
      const body = route.request().postDataJSON() as { comment: string | null }
      lifecycleRequests.push({ action: 'MARK_NO_SHOW', body })
      currentAppointment = nextAppointmentVersion(currentAppointment, {
        allowed_actions: [],
        completed_at: '2026-08-06T13:15:00Z',
        status: 'NO_SHOW',
        updated_at: '2026-08-06T13:15:00Z',
      })
      events = prependAppointmentEvent(events, {
        event_type: 'APPOINTMENT_MARKED_NO_SHOW',
        occurred_at: '2026-08-06T13:15:00Z',
        payload: { comment: body.comment },
      })
      await fulfillAppointmentMutation(route, currentAppointment)
    },
  )

  return {
    documentDownloads,
    documentUploads,
    eventPageRequests,
    lifecycleRequests,
    listRequests,
  }
}

function createInitialAppointmentEvents(
  scenario: AppointmentReadApiOptions['eventHistory'],
): AppointmentEventFixture[] {
  const booked = appointmentBookedEvent()
  if (scenario !== 'paginated-with-unknown') return [booked]

  return [
    createAppointmentEvent({
      event_type: 'APPOINTMENT_RESCHEDULED',
      occurred_at: '2026-08-06T12:00:00Z',
      payload: {
        new_ends_at: '2026-08-12T09:30:00Z',
        new_slot_id: '00000000-0000-4000-8000-000000000040',
        new_starts_at: '2026-08-12T09:00:00Z',
        previous_ends_at: '2026-08-11T09:30:00Z',
        previous_slot_id: '00000000-0000-4000-8000-000000000039',
        previous_starts_at: '2026-08-11T09:00:00Z',
        reason: 'Bürgerwunsch',
      },
      sequence_number: 3,
    }),
    createAppointmentEvent({
      event_type: 'APPOINTMENT_REOPENED',
      occurred_at: '2026-08-05T12:00:00Z',
      payload: { future_contract: true },
      sequence_number: 2,
    }),
    booked,
  ]
}

function appointmentBookedEvent(): AppointmentEventFixture {
  return {
    actor: { display_name: 'Clara Bürgerin', id: APPOINTMENT_CITIZEN_ID },
    actor_user_id: APPOINTMENT_CITIZEN_ID,
    event_type: 'APPOINTMENT_BOOKED',
    id: '00000000-0000-4000-8000-000000000501',
    occurred_at: '2026-08-01T08:00:00Z',
    payload: {
      citizen_id: APPOINTMENT_CITIZEN_ID,
      ends_at: '2026-08-12T09:30:00Z',
      office_id: APPOINTMENT_OFFICE_ID,
      reason: 'Ummeldung des Wohnsitzes',
      slot_id: '00000000-0000-4000-8000-000000000040',
      starts_at: '2026-08-12T09:00:00Z',
      ticket_id: APPOINTMENT_TICKET_ID,
    },
    sequence_number: 1,
  }
}

function createAppointmentEvent(
  input: Pick<
    AppointmentEventFixture,
    'event_type' | 'occurred_at' | 'payload' | 'sequence_number'
  >,
): AppointmentEventFixture {
  return {
    actor: {
      display_name: 'Olaf Ordnung',
      id: '00000000-0000-4000-8000-000000000201',
    },
    actor_user_id: '00000000-0000-4000-8000-000000000201',
    id: `00000000-0000-4000-8000-${String(input.sequence_number + 500).padStart(12, '0')}`,
    ...input,
  }
}

function prependAppointmentEvent(
  events: readonly AppointmentEventFixture[],
  input: Pick<AppointmentEventFixture, 'event_type' | 'occurred_at' | 'payload'>,
): AppointmentEventFixture[] {
  const nextSequence = Math.max(0, ...events.map((event) => event.sequence_number)) + 1
  return [
    createAppointmentEvent({ ...input, sequence_number: nextSequence }),
    ...events,
  ]
}

function nextAppointmentVersion(
  appointment: AppointmentFixture,
  changes: Partial<AppointmentFixture>,
): AppointmentFixture {
  return {
    ...appointment,
    ...changes,
    version: appointment.version + 1,
  }
}

async function fulfillAppointmentMutation(
  route: Route,
  appointment: AppointmentFixture,
): Promise<void> {
  await route.fulfill({
    contentType: 'application/json',
    json: appointment,
    status: 200,
  })
}

export {
  APPOINTMENT_CITIZEN_ID,
  APPOINTMENT_DOCUMENT_GROUP_ID,
  APPOINTMENT_DOCUMENT_VERSION_ID,
  APPOINTMENT_ID,
  APPOINTMENT_OFFICE_ID,
  APPOINTMENT_TICKET_ID,
  RESCHEDULE_APPOINTMENT_SLOT_ID,
} from './appointment-api-data.js'

export type AppointmentSlotApi = Readonly<{
  createRequests: unknown[]
  deactivatedSlotIds: string[]
  listRequests: string[]
}>

/** Installs mutable slot-capacity endpoints for list, batch and deactivation tests. */
export async function installAppointmentSlotApi(
  page: Page,
): Promise<AppointmentSlotApi> {
  const createRequests: unknown[] = []
  const deactivatedSlotIds: string[] = []
  const listRequests: string[] = []
  let slots = [
    appointmentSlotResponse(),
    rescheduleAppointmentSlotResponse(),
    expiredAppointmentSlotResponse(),
  ]

  await page.route(
    `**/api/v1/offices/${APPOINTMENT_OFFICE_ID}/appointment-slots`,
    async (route) => {
      const request = route.request()

      if (request.method() === 'POST') {
        const body = request.postDataJSON() as {
          slots?: Array<{ ends_at: string; starts_at: string }>
        }
        createRequests.push(body)
        const created = (body.slots ?? []).map((slot, index) => ({
          created_at: '2026-08-06T12:00:00Z',
          ends_at: slot.ends_at,
          id: `00000000-0000-4000-8000-${String(index + 50).padStart(12, '0')}`,
          office_id: APPOINTMENT_OFFICE_ID,
          starts_at: slot.starts_at,
          status: 'AVAILABLE',
        }))
        slots = [...slots, ...created]
        await route.fulfill({
          contentType: 'application/json',
          json: created,
          status: 201,
        })
        return
      }

      const url = new URL(request.url())
      listRequests.push(url.search)
      const status = url.searchParams.get('status')
      const startsFrom = url.searchParams.get('starts_from')
      const filteredSlots = slots.filter(
        (slot) =>
          (!status || slot.status === status) &&
          (!startsFrom || Date.parse(slot.starts_at) >= Date.parse(startsFrom)),
      )
      await route.fulfill({
        contentType: 'application/json',
        json: {
          data: filteredSlots,
          page: 1,
          pages: 1,
          size: Number(url.searchParams.get('size') ?? 20),
          total: filteredSlots.length,
        },
        status: 200,
      })
    },
  )

  await page.route(
    `**/api/v1/offices/${APPOINTMENT_OFFICE_ID}/appointment-slots/*`,
    async (route) => {
      const slotId = route.request().url().split('/').at(-1) ?? ''
      deactivatedSlotIds.push(slotId)
      slots = slots.map((slot) =>
        slot.id === slotId ? { ...slot, status: 'INACTIVE' } : slot,
      )
      await route.fulfill({ status: 204 })
    },
  )

  return { createRequests, deactivatedSlotIds, listRequests }
}

function readMultipartValue(body: string, fieldName: string): string {
  const pattern = new RegExp(
    String.raw`name="${fieldName}"\r?\n(?:Content-Type:[^\r\n]+\r?\n)?\r?\n([^\r\n]*)`,
  )
  return pattern.exec(body)?.[1] ?? ''
}

function readMultipartFilename(body: string, fieldName: string): string {
  const pattern = new RegExp(`name="${fieldName}"; filename="([^"]+)"`)
  return pattern.exec(body)?.[1] ?? ''
}
