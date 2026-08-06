import { expect, test } from '@playwright/test'

import { expectNoSeriousAccessibilityViolations } from './fixtures/accessibility.js'
import {
  installAppointmentReadApi,
  installAppointmentSlotApi,
  APPOINTMENT_ID,
  APPOINTMENT_OFFICE_ID,
  APPOINTMENT_TICKET_ID,
} from './fixtures/appointment-api.js'
import {
  appointmentResponse,
  startedAppointmentResponse,
} from './fixtures/appointment-api-data.js'
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

const manager = {
  email: 'manager@example.test',
  first_name: 'Mara',
  id: '00000000-0000-4000-8000-000000000203',
  last_name: 'Management',
  office_id: APPOINTMENT_OFFICE_ID,
  role: 'MANAGER',
} satisfies AuthorityUserFixture

const dispatcher = {
  email: 'dispatcher@example.test',
  first_name: 'Diana',
  id: '00000000-0000-4000-8000-000000000202',
  last_name: 'Disposition',
  office_id: null,
  role: 'DISPATCHER',
} satisfies AuthorityUserFixture

const administrator = {
  email: 'admin@example.test',
  first_name: 'Ada',
  id: '00000000-0000-4000-8000-000000000204',
  last_name: 'Admin',
  office_id: null,
  role: 'ADMIN',
} satisfies AuthorityUserFixture

test('officer reads and filters the device-adapted appointment workspace', async ({
  page,
}, testInfo) => {
  const appointmentApi = await installAppointmentReadApi(page)
  const { lifecycleRequests, listRequests } = appointmentApi
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
  await detail.expectBookedEvent()
  await expect(
    page.getByRole('link', { name: 'Anliegen zur Ummeldung' }),
  ).toHaveAttribute('href', `/tickets/${APPOINTMENT_TICKET_ID}`)
  await expectNoSeriousAccessibilityViolations(page)

  await detail.expectDocumentsLoaded()
  await detail.expandDocumentHistory()
  expect(await detail.downloadCurrentDocument()).toBe('terminhinweis-v2.pdf')
  await expect.poll(() => appointmentApi.documentDownloads.length).toBe(1)
  await detail.uploadDocumentReplacement()
  await expect.poll(() => appointmentApi.documentUploads.length).toBe(1)
  expect(appointmentApi.documentUploads[0]).toEqual({
    documentType: 'NOTICE',
    filename: 'terminhinweis-v3.pdf',
    groupId: '00000000-0000-4000-8000-000000000600',
    visible: 'true',
  })
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

test('officer cancels a future appointment only after explicit confirmation', async ({
  page,
}) => {
  const appointmentApi = await installAppointmentReadApi(page, {
    initialAppointment: appointmentResponse({ allowed_actions: ['CANCEL'] }),
  })
  const directory = new AppointmentDirectoryPageObject(page)
  const detail = new AppointmentDetailPageObject(page)

  await signInAsAuthorityUser(page, '/appointments', officer)
  await directory.openFirstAppointment()
  await detail.cancelAppointment('Bürger hat den Termin abgesagt')

  expect(appointmentApi.lifecycleRequests).toEqual([
    {
      action: 'CANCEL',
      body: { reason: 'Bürger hat den Termin abgesagt' },
    },
  ])
  await expect(page.getByText('Storniert').first()).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Ereignishistorie' }),
  ).toContainText('Bürger hat den Termin abgesagt')
  await expectNoSeriousAccessibilityViolations(page)
})

test('manager completes a begun appointment with an internal note', async ({
  page,
}) => {
  const appointmentApi = await installAppointmentReadApi(page, {
    initialAppointment: startedAppointmentResponse(['COMPLETE']),
  })
  const directory = new AppointmentDirectoryPageObject(page)
  const detail = new AppointmentDetailPageObject(page)

  await signInAsAuthorityUser(page, '/appointments', manager)
  await directory.openFirstAppointment()
  await detail.completeAppointment('Unterlagen geprüft und ausgehändigt.')

  expect(appointmentApi.lifecycleRequests).toEqual([
    {
      action: 'COMPLETE',
      body: { comment: 'Unterlagen geprüft und ausgehändigt.' },
    },
  ])
  await expect(page.getByText('Abgeschlossen').first()).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Ereignishistorie' }),
  ).toContainText('Unterlagen geprüft und ausgehändigt.')
  await expectNoSeriousAccessibilityViolations(page)
})

test('officer records no-show separately from completion', async ({ page }) => {
  const appointmentApi = await installAppointmentReadApi(page, {
    initialAppointment: startedAppointmentResponse(['MARK_NO_SHOW']),
  })
  const directory = new AppointmentDirectoryPageObject(page)
  const detail = new AppointmentDetailPageObject(page)

  await signInAsAuthorityUser(page, '/appointments', officer)
  await directory.openFirstAppointment()
  await detail.markAppointmentNoShow('Bürger war nicht vor Ort.')

  expect(appointmentApi.lifecycleRequests).toEqual([
    {
      action: 'MARK_NO_SHOW',
      body: { comment: 'Bürger war nicht vor Ort.' },
    },
  ])
  await expect(page.getByText('Nicht erschienen').first()).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Ereignishistorie' }),
  ).toContainText('Bürger war nicht vor Ort.')
  await expectNoSeriousAccessibilityViolations(page)
})

test('appointment action dialogs guard dirty input and restore trigger focus', async ({
  page,
}) => {
  await installAppointmentReadApi(page, {
    initialAppointment: appointmentResponse({ allowed_actions: ['CANCEL'] }),
  })
  const directory = new AppointmentDirectoryPageObject(page)
  const detail = new AppointmentDetailPageObject(page)

  await signInAsAuthorityUser(page, '/appointments', officer)
  await directory.openFirstAppointment()
  await detail.expectDirtyActionGuardAndFocusRestoration()
  await expectNoSeriousAccessibilityViolations(page)
})

test('event history loads older pages and falls back for future event types', async ({
  page,
}) => {
  const appointmentApi = await installAppointmentReadApi(page, {
    eventHistory: 'paginated-with-unknown',
  })
  const directory = new AppointmentDirectoryPageObject(page)
  const detail = new AppointmentDetailPageObject(page)

  await signInAsAuthorityUser(page, '/appointments', officer)
  await directory.openFirstAppointment()
  await expect(
    page.getByRole('region', { name: 'Ereignishistorie' }),
  ).toContainText('Termin verschoben')

  await detail.loadOlderEvents()
  await expect(page.getByText(/Unbekanntes Ereignis/)).toBeVisible()
  await detail.loadOlderEvents()
  await detail.expectBookedEvent()

  expect([...new Set(appointmentApi.eventPageRequests)]).toEqual([1, 2, 3])
  await expect(page.getByText('3 von 3 Ereignissen angezeigt')).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page)
})

for (const user of [dispatcher, administrator]) {
  test(`${user.role.toLowerCase()} cannot enter appointment routes`, async ({
    page,
  }) => {
    await signInAsAuthorityUser(page, '/', user)

    for (const path of [
      '/appointments',
      `/appointments/${APPOINTMENT_ID}`,
      '/appointments/slots',
      '/appointments/slots/new',
    ]) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/forbidden$/)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Zugriff nicht erlaubt' }),
      ).toBeVisible()
    }

    await expect(page.getByRole('link', { name: 'Termine' })).toHaveCount(0)
  })
}

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

test('appointment workspaces reflow without horizontal page scrolling at 320 CSS pixels', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.setViewportSize({ height: 800, width: 320 })
  await installAppointmentReadApi(page)
  await installAppointmentSlotApi(page)
  const directory = new AppointmentDirectoryPageObject(page)
  const detail = new AppointmentDetailPageObject(page)

  await signInAsAuthorityUser(page, '/appointments', officer)
  await directory.openFirstAppointment()
  await detail.expectLoaded()
  await detail.expectDocumentsLoaded()
  await detail.expectNoHorizontalOverflow()

  for (const label of ['Verschieben', 'Stornieren', 'PDF hochladen']) {
    const button = page.getByRole('button', { name: label })
    await button.scrollIntoViewIfNeeded()
    const box = await button.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  }

  await page.goto('/appointments/slots/new')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Terminslots anlegen' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Terminslot hinzufügen' })
    .scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Terminslot hinzufügen' }).click()
  await expect(page.getByText('2 von 100 Slots')).toBeVisible()
  await detail.expectNoHorizontalOverflow()
  const addSlotButton = page.getByRole('button', {
    name: 'Terminslot hinzufügen',
  })
  const addSlotButtonBox = await addSlotButton.boundingBox()
  expect(addSlotButtonBox?.height).toBeGreaterThanOrEqual(44)

  await page.setViewportSize({ height: 390, width: 844 })
  await detail.expectNoHorizontalOverflow()
  await expect(
    page.getByRole('link', { name: 'Zur Slotübersicht' }),
  ).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page)
})
