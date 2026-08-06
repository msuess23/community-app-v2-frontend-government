import type { Page } from '@playwright/test'

import {
  APPOINTMENT_CITIZEN_ID,
  APPOINTMENT_ID,
  APPOINTMENT_TICKET_ID,
  appointmentResponse,
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
