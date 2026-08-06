import type { Page } from '@playwright/test'

import {
  APPOINTMENT_CITIZEN_ID,
  APPOINTMENT_ID,
  APPOINTMENT_OFFICE_ID,
  APPOINTMENT_TICKET_ID,
  appointmentResponse,
  appointmentSlotResponse,
  expiredAppointmentSlotResponse,
  secondAppointmentResponse,
} from './appointment-api-data.js'

export type AppointmentReadApi = Readonly<{
  listRequests: string[]
}>

/** Installs a role-scoped appointment read API for browser workspace tests. */
export async function installAppointmentReadApi(
  page: Page,
): Promise<AppointmentReadApi> {
  const listRequests: string[] = []

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
        data: [appointmentResponse(), secondAppointmentResponse()],
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
        json: appointmentResponse(),
        status: 200,
      })
    },
  )

  return { listRequests }
}

export {
  APPOINTMENT_CITIZEN_ID,
  APPOINTMENT_ID,
  APPOINTMENT_OFFICE_ID,
  APPOINTMENT_TICKET_ID,
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
  let slots = [appointmentSlotResponse(), expiredAppointmentSlotResponse()]

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

      listRequests.push(new URL(request.url()).search)
      await route.fulfill({
        contentType: 'application/json',
        json: {
          data: slots,
          page: 1,
          pages: 1,
          size: 20,
          total: slots.length,
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
