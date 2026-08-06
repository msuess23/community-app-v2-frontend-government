import { expect, test } from '@playwright/test'

import { expectNoSeriousAccessibilityViolations } from './fixtures/accessibility.js'
import {
  installAppointmentReadApi,
  installAppointmentSlotApi,
  APPOINTMENT_OFFICE_ID,
  APPOINTMENT_TICKET_ID,
} from './fixtures/appointment-api.js'
import {
  signInAsAuthorityUser,
  type AuthorityUserFixture,
} from './fixtures/auth.js'
import {
  AppointmentDetailPageObject,
  AppointmentDirectoryPageObject,
  AppointmentSlotCreatePageObject,
  AppointmentSlotDirectoryPageObject,
} from './pages/appointment-pages.js'

const officer = {
  email: 'officer@example.test',
  first_name: 'Olaf',
  id: '00000000-0000-4000-8000-000000000201',
  last_name: 'Ordnung',
  office_id: APPOINTMENT_OFFICE_ID,
  role: 'OFFICER',
} satisfies AuthorityUserFixture

const dispatcher = {
  email: 'dispatcher@example.test',
  first_name: 'Diana',
  id: '00000000-0000-4000-8000-000000000202',
  last_name: 'Disposition',
  office_id: null,
  role: 'DISPATCHER',
} satisfies AuthorityUserFixture

test('officer reads and filters the device-adapted appointment workspace', async ({
  page,
}, testInfo) => {
  const { lifecycleRequests, listRequests } =
    await installAppointmentReadApi(page)
  await installAppointmentSlotApi(page)
  const directory = new AppointmentDirectoryPageObject(page)
  const detail = new AppointmentDetailPageObject(page)

  await signInAsAuthorityUser(page, '/appointments', officer)
  await directory.expectLoaded()

  const table = page.getByRole('table', { name: 'Terminverzeichnis' })
  const compactList = page.getByRole('list', { name: 'Terminverzeichnis' })
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(table).toBeVisible()
    await expect(compactList).toBeHidden()
  } else {
    await expect(table).toBeHidden()
    await expect(compactList).toBeVisible()
  }
  await expectNoSeriousAccessibilityViolations(page)

  await directory.selectStatus('SCHEDULED')
  await expect(page).toHaveURL(/status=SCHEDULED/)
  await expect
    .poll(() =>
      listRequests.some((request) => request.includes('status=SCHEDULED')),
    )
    .toBe(true)

  await directory.openFirstAppointment()
  await detail.expectLoaded()
  await expect(
    page.getByRole('link', { name: 'Anliegen zur Ummeldung' }),
  ).toHaveAttribute('href', `/tickets/${APPOINTMENT_TICKET_ID}`)
  await expectNoSeriousAccessibilityViolations(page)

  await detail.rescheduleAppointment('Wunsch des Bürgers')
  await expect.poll(() => lifecycleRequests.length).toBe(1)
  expect(lifecycleRequests[0]).toEqual({
    action: 'RESCHEDULE',
    body: {
      reason: 'Wunsch des Bürgers',
      target_slot_id: '00000000-0000-4000-8000-000000000042',
    },
  })
  await expect(
    page.getByRole('region', { name: 'Ereignishistorie' }),
  ).toContainText('Termin verschoben')
  await expectNoSeriousAccessibilityViolations(page)
})

test('dispatcher cannot enter the appointment workspace', async ({ page }) => {
  await signInAsAuthorityUser(page, '/', dispatcher)
  await page.goto('/appointments')
  await expect(page).toHaveURL(/\/forbidden$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Zugriff nicht erlaubt' }),
  ).toBeVisible()
})

test('officer manages responsive appointment-slot capacity without optimistic states', async ({
  page,
}, testInfo) => {
  const slotApi = await installAppointmentSlotApi(page)
  const directory = new AppointmentSlotDirectoryPageObject(page)
  const createPage = new AppointmentSlotCreatePageObject(page)

  await signInAsAuthorityUser(page, '/appointments/slots', officer)
  await directory.expectLoaded()

  const table = page.getByRole('table', { name: 'Terminslotverzeichnis' })
  const compactList = page.getByRole('list', {
    name: 'Terminslotverzeichnis',
  })
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(table).toBeVisible()
    await expect(compactList).toBeHidden()
  } else {
    await expect(table).toBeHidden()
    await expect(compactList).toBeVisible()
  }
  await expect(page.getByText('Verstrichen').first()).toBeAttached()
  await expectNoSeriousAccessibilityViolations(page)

  await directory.selectStatus('AVAILABLE')
  await expect(page).toHaveURL(/status=AVAILABLE/)
  await expect
    .poll(() =>
      slotApi.listRequests.some((request) =>
        request.includes('status=AVAILABLE'),
      ),
    )
    .toBe(true)

  await directory.openCreate()
  await createPage.expectLoaded()
  await createPage.fillTwoUnsortedSlots()
  await expectNoSeriousAccessibilityViolations(page)
  await createPage.submit()

  await expect.poll(() => slotApi.createRequests.length).toBe(1)
  const request = slotApi.createRequests[0] as {
    slots: Array<{ starts_at: string }>
  }
  expect(request.slots.map((slot) => slot.starts_at)).toEqual([
    '2099-08-22T07:00:00.000Z',
    '2099-08-22T10:00:00.000Z',
  ])

  await directory.expectLoaded()
  await directory.deactivateFirstAvailableSlot()
  await expect.poll(() => slotApi.deactivatedSlotIds.length).toBe(1)
  await expectNoSeriousAccessibilityViolations(page)
})
