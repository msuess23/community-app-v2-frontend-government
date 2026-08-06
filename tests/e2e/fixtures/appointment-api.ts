import type { Page } from '@playwright/test'

import {
  APPOINTMENT_CITIZEN_ID,
  APPOINTMENT_ID,
  APPOINTMENT_OFFICE_ID,
  APPOINTMENT_TICKET_ID,
  appointmentResponse,
  appointmentSlotResponse,
  expiredAppointmentSlotResponse,
  RESCHEDULE_APPOINTMENT_SLOT_ID,
  rescheduleAppointmentSlotResponse,
  secondAppointmentResponse,
} from './appointment-api-data.js'

export type AppointmentReadApi = Readonly<{
  lifecycleRequests: Array<Readonly<{ action: string; body: unknown }>>
  listRequests: string[]
}>

/** Installs a role-scoped appointment read API for browser workspace tests. */
export async function installAppointmentReadApi(
  page: Page,
): Promise<AppointmentReadApi> {
  const lifecycleRequests: Array<
    Readonly<{ action: string; body: unknown }>
  > = []
  const listRequests: string[] = []
  let currentAppointment = appointmentResponse()
  let events = appointmentEventsResponse()

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
    `**/api/v1/appointments/${APPOINTMENT_ID}/events?*`,
    async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        json: events,
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
      currentAppointment = {
        ...currentAppointment,
        allowed_actions: ['RESCHEDULE', 'CANCEL'],
        current_slot_id: body.target_slot_id,
        ends_at: '2099-08-21T10:30:00Z',
        starts_at: '2099-08-21T10:00:00Z',
        updated_at: '2026-08-06T13:00:00Z',
        version: currentAppointment.version + 1,
      }
      events = appointmentEventsResponse({
        event_type: 'APPOINTMENT_RESCHEDULED',
        id: '00000000-0000-4000-8000-000000000502',
        occurred_at: '2026-08-06T13:00:00Z',
        payload: {
          new_ends_at: currentAppointment.ends_at,
          new_slot_id: body.target_slot_id,
          new_starts_at: currentAppointment.starts_at,
          previous_ends_at: '2026-08-12T09:30:00Z',
          previous_slot_id: '00000000-0000-4000-8000-000000000040',
          previous_starts_at: '2026-08-12T09:00:00Z',
          reason: body.reason,
        },
        sequence_number: 2,
      })
      await route.fulfill({
        contentType: 'application/json',
        json: currentAppointment,
        status: 200,
      })
    },
  )

  return { lifecycleRequests, listRequests }
}

function appointmentEventsResponse(additionalEvent?: Record<string, unknown>) {
  const booked = {
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
  const data = additionalEvent
    ? [
        {
          actor: {
            display_name: 'Olaf Ordnung',
            id: '00000000-0000-4000-8000-000000000201',
          },
          actor_user_id: '00000000-0000-4000-8000-000000000201',
          ...additionalEvent,
        },
        booked,
      ]
    : [booked]

  return {
    data,
    page: 1,
    pages: 1,
    size: 20,
    total: data.length,
  }
}

export {
  APPOINTMENT_CITIZEN_ID,
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
