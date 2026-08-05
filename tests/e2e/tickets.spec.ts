import { expect, test } from '@playwright/test'

import { expectNoSeriousAccessibilityViolations } from './fixtures/accessibility'
import {
  signInAsAuthorityUser,
  type AuthorityUserFixture,
} from './fixtures/auth'
import {
  installTicketReadApi,
  TICKET_ID,
  TICKET_OFFICE_ID,
} from './fixtures/ticket-api'
import {
  TicketDetailPageObject,
  TicketDirectoryPageObject,
} from './pages/ticket-pages'

const officer = {
  email: 'officer@example.test',
  first_name: 'Olaf',
  id: 'officer-1',
  last_name: 'Ordnung',
  office_id: TICKET_OFFICE_ID,
  role: 'OFFICER',
} satisfies AuthorityUserFixture

const dispatcher = {
  email: 'dispatcher@example.test',
  first_name: 'Diana',
  id: 'dispatcher-1',
  last_name: 'Disposition',
  office_id: null,
  role: 'DISPATCHER',
} satisfies AuthorityUserFixture

const manager = {
  email: 'manager@example.test',
  first_name: 'Mara',
  id: 'manager-1',
  last_name: 'Management',
  office_id: TICKET_OFFICE_ID,
  role: 'MANAGER',
} satisfies AuthorityUserFixture

const administrator = {
  email: 'admin@example.test',
  first_name: 'Ada',
  id: 'admin-1',
  last_name: 'Administration',
  office_id: null,
  role: 'ADMIN',
} satisfies AuthorityUserFixture

test('authority users read and filter the device-adapted ticket workspace', async ({
  page,
}, testInfo) => {
  const { listRequests } = await installTicketReadApi(page)
  const directory = new TicketDirectoryPageObject(page)
  const detail = new TicketDetailPageObject(page)

  await signInAsAuthorityUser(page, '/tickets', officer)
  await directory.expectLoaded()

  const table = page.getByRole('table', { name: 'Ticketverzeichnis' })
  const compactList = page.getByRole('list', { name: 'Ticketverzeichnis' })

  if (testInfo.project.name === 'desktop-chromium') {
    await expect(table).toBeVisible()
    await expect(compactList).toBeHidden()
  } else {
    await expect(table).toBeHidden()
    await expect(compactList).toBeVisible()
    const cards = compactList.getByRole('listitem')
    const first = await cards.nth(0).boundingBox()
    const second = await cards.nth(1).boundingBox()
    expect(first).not.toBeNull()
    expect(second).not.toBeNull()

    if (testInfo.project.name === 'tablet-chromium') {
      expect(Math.abs((first?.y ?? 0) - (second?.y ?? 0))).toBeLessThan(8)
      expect(second?.x).toBeGreaterThan(first?.x ?? 0)
    } else {
      expect(second?.y).toBeGreaterThan((first?.y ?? 0) + 20)
    }
  }

  await expectNoSeriousAccessibilityViolations(page)

  await directory.selectWorkflowState('IN_PROGRESS')
  await expect(page).toHaveURL(/workflowState=IN_PROGRESS/)
  await expect
    .poll(() =>
      listRequests.some((request) =>
        request.includes('workflow_state=IN_PROGRESS'),
      ),
    )
    .toBe(true)

  await directory.openFirstTicket()
  await detail.expectLoaded()
  await expect(page.getByText('Die Bearbeitung wurde aufgenommen.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Tiefbauamt' })).toHaveAttribute(
    'href',
    `/offices/${TICKET_OFFICE_ID}`,
  )
  await expect(page.getByText('Ticket weitergeleitet')).toBeVisible()
  await expect(page.getByText('Erika Einsatz')).toBeVisible()
  await expect(
    page.getByRole('radio', { name: 'Interne Notiz' }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'Kommentare und interne Notizen' })
      .getByText('Öffentlich'),
  ).toBeVisible()
  await expect(page.getByText('Historisch entfernte Bilder')).toBeVisible()
  await expect(page.getByText('schlagloch-alt.jpg')).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page)

  await detail.returnToDirectory()
  await expect(page).toHaveURL(/\/tickets\?workflowState=IN_PROGRESS/)
})

test('officer executes one server-driven forwarding action', async ({ page }) => {
  const { workflowRequests } = await installTicketReadApi(page)
  const directory = new TicketDirectoryPageObject(page)
  const detail = new TicketDetailPageObject(page)

  await signInAsAuthorityUser(page, '/tickets', officer)
  await directory.expectLoaded()
  await directory.openFirstTicket()
  await detail.expectLoaded()

  await detail.forwardTicketTo(
    'officer-3',
    'Bitte die Straßensperrung koordinieren.',
  )

  await expect(page.getByText('Ticket weitergeleitet')).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Aktuelle Zuständigkeit' }),
  ).toContainText('Erika Einsatz')
  expect(workflowRequests).toEqual([
    {
      action: 'FORWARD',
      comment: 'Bitte die Straßensperrung koordinieren.',
      target_user_id: 'officer-3',
    },
  ])
  await expectNoSeriousAccessibilityViolations(page)
})

test('officer appends comments and reads revisioned ticket images', async ({
  page,
}) => {
  const { commentRequests } = await installTicketReadApi(page)
  const directory = new TicketDirectoryPageObject(page)
  const detail = new TicketDetailPageObject(page)

  await signInAsAuthorityUser(page, '/tickets', officer)
  await directory.openFirstTicket()
  await detail.expectLoaded()

  await detail.addInternalNote('Bitte zunächst intern abstimmen.')
  await detail.addPublicComment('Die Absicherung ist für morgen vorgesehen.')

  expect(commentRequests).toEqual([
    { is_internal: true, text: 'Bitte zunächst intern abstimmen.' },
    {
      is_internal: false,
      text: 'Die Absicherung ist für morgen vorgesehen.',
    },
  ])
  await expect(
    page.getByRole('region', { name: 'Ereignishistorie' }),
  ).toContainText('Interne Notiz hinzugefügt')
  await expect(
    page.getByRole('region', { name: 'Aktuelle Ticketbilder' }),
  ).toBeVisible()
  await expect(page.getByText('schlagloch-detail.jpg')).toBeVisible()
  await expect(page.getByText('Historisch entfernte Bilder')).toBeVisible()
  await expect(page.getByText('schlagloch-alt.jpg')).toBeVisible()
  await expect(page.getByLabel('Bilddateien auswählen')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /Als Titelbild verwenden:/ }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /Bild entfernen:/ }),
  ).toHaveCount(0)
  await expectNoSeriousAccessibilityViolations(page)
})

test('dispatcher receives only dispatch actions and no removed image history', async ({
  page,
}) => {
  const { imageListRequests } = await installTicketReadApi(page, {
    ticket: {
      allowed_actions: ['DISPATCH'],
      current_assignee: null,
      current_assignee_id: null,
      current_status: {
        created_at: '2026-08-05T08:00:00Z',
        id: 'status-dispatch',
        message: null,
        status: 'OPEN',
      },
      office: null,
      office_id: null,
      primary_officer: null,
      primary_officer_id: null,
      workflow_state: 'NEW',
    },
    workflowOptions: {
      completion_outcomes: [],
      forward_targets: [],
      offices: [{ id: TICKET_OFFICE_ID, name: 'Tiefbauamt' }],
    },
  })
  const directory = new TicketDirectoryPageObject(page)
  const detail = new TicketDetailPageObject(page)

  await signInAsAuthorityUser(page, '/tickets', dispatcher)
  await directory.openFirstTicket()

  const actions = page.getByRole('group', {
    name: 'Verfügbare Ticketaktionen',
  })
  await expect(actions.getByRole('button')).toHaveCount(1)
  await expect(
    actions.getByRole('button', { name: 'Behörde zuordnen' }),
  ).toBeVisible()
  await expect(page.getByLabel('Bilddateien auswählen')).toHaveCount(0)
  await expect(page.getByText('Historisch entfernte Bilder')).toHaveCount(0)
  await expect
    .poll(() =>
      imageListRequests.some((request) =>
        request.includes('include_removed=false'),
      ),
    )
    .toBe(true)

  const { dialog } = await detail.openWorkflowAction(
    'Behörde zuordnen',
    'Ticket einer Behörde zuordnen',
  )
  await expect(dialog.getByLabel('Zuständige Behörde')).toContainText(
    'Tiefbauamt',
  )
  await expectNoSeriousAccessibilityViolations(page)
})

test('manager receives server-approved rejection as a completion outcome', async ({
  page,
}) => {
  await installTicketReadApi(page, {
    ticket: { allowed_actions: ['COMPLETE'] },
    workflowOptions: { completion_outcomes: ['RESOLVED', 'REJECTED'] },
  })
  const directory = new TicketDirectoryPageObject(page)
  const detail = new TicketDetailPageObject(page)

  await signInAsAuthorityUser(page, '/tickets', manager)
  await directory.openFirstTicket()
  const { dialog } = await detail.openWorkflowAction(
    'Abschließen',
    'Ticket abschließen',
  )

  await expect(dialog.getByRole('radio', { name: /Erledigt/ })).toBeVisible()
  await expect(dialog.getByRole('radio', { name: /Abgelehnt/ })).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page)
})

test('administrator cannot enter the ticket workspace', async ({ page }) => {
  await signInAsAuthorityUser(page, '/', administrator)
  await page.goto('/tickets')

  await expect(page).toHaveURL(/\/forbidden$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Zugriff nicht erlaubt' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Tickets' })).toHaveCount(0)
})

test('workflow dialogs guard dirty input and restore focus to their trigger', async ({
  page,
}) => {
  await installTicketReadApi(page)
  const directory = new TicketDirectoryPageObject(page)
  const detail = new TicketDetailPageObject(page)

  await signInAsAuthorityUser(page, '/tickets', officer)
  await directory.openFirstTicket()
  const { dialog, trigger } = await detail.openWorkflowAction(
    'Weiterleiten',
    'Ticket weiterleiten',
  )
  await expect(
    dialog.getByRole('button', { name: 'Aktionsdialog schließen' }),
  ).toBeFocused()

  await dialog.getByLabel('Weiterleiten an').selectOption('officer-3')
  await dialog.getByLabel('Optionaler Kommentar').fill('Noch nicht speichern.')
  await page.keyboard.press('Escape')

  const confirmation = page.getByRole('dialog', {
    name: 'Ticketaktion abbrechen?',
  })
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(dialog).toBeVisible()

  await dialog
    .getByRole('button', { name: 'Aktionsdialog schließen' })
    .click()
  await expect(confirmation).toBeVisible()
  await confirmation
    .getByRole('button', { name: 'Eingaben verwerfen' })
    .click()

  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('ticket detail reflows without horizontal page scrolling at 320 CSS pixels', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.setViewportSize({ height: 800, width: 320 })
  await installTicketReadApi(page)
  const directory = new TicketDirectoryPageObject(page)
  const detail = new TicketDetailPageObject(page)

  await signInAsAuthorityUser(page, '/tickets', officer)
  await directory.openFirstTicket()
  await detail.expectLoaded()
  await detail.expectNoHorizontalOverflow()

  const actionButton = page.getByRole('button', { name: 'Weiterleiten' })
  const actionBox = await actionButton.boundingBox()
  expect(actionBox?.height).toBeGreaterThanOrEqual(44)

  await page.setViewportSize({ height: 390, width: 844 })
  await detail.expectNoHorizontalOverflow()
  await expect(
    page.getByRole('link', { name: 'Zurück zum Ticketverzeichnis' }),
  ).toBeVisible()
})
