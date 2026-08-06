import { expect, test } from '@playwright/test'

import { expectNoSeriousAccessibilityViolations } from './fixtures/accessibility.js'
import {
  installAppointmentReadApi,
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
  const { listRequests } = await installAppointmentReadApi(page)
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
})

test('dispatcher cannot enter the appointment workspace', async ({ page }) => {
  await signInAsAuthorityUser(page, '/', dispatcher)
  await page.goto('/appointments')
  await expect(page).toHaveURL(/\/forbidden$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Zugriff nicht erlaubt' }),
  ).toBeVisible()
})
