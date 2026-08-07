import { expect, test, type BrowserContext } from '@playwright/test'

import { VALID_PDF, VALID_PNG } from './fixtures/binary-files.js'
import {
  loginThroughUi,
  registerCitizenThroughUi,
  type AuthenticatedBrowser,
} from './fixtures/auth.js'
import {
  createScenarioIdentity,
  SEED_ACCOUNTS,
  SEED_NEW_TICKET_TITLE,
  SEED_SCHEDULED_APPOINTMENT_REASON,
} from './fixtures/fullstack-environment.js'
import {
  AdminPageObject,
  AppointmentPageObject,
  expectForbidden,
  InfoPageObject,
  TicketPageObject,
} from './pages/fullstack-pages.js'

test('master workflow crosses real users, roles, events, uploads and object permissions', async ({
  browser,
}) => {
  const scenario = createScenarioIdentity()
  const sessions: AuthenticatedBrowser[] = []

  async function login(
    account: Parameters<typeof loginThroughUi>[1],
    returnTo: string,
  ): Promise<AuthenticatedBrowser> {
    const session = await loginThroughUi(browser, account, returnTo)
    sessions.push(session)
    return session
  }

  try {
    // Public registration creates only citizen accounts. Administration then turns
    // those real accounts into the roles used by the cross-user workflow.
    await registerCitizenThroughUi(browser, scenario.manager)
    await registerCitizenThroughUi(browser, scenario.officerA)
    await registerCitizenThroughUi(browser, scenario.officerB)

    const officerA = await login(scenario.officerA, '/access-pending')
    await officerA.page.goto('/tickets')
    await expect(officerA.page).toHaveURL(/\/access-pending$/)
    await expect(
      officerA.page.getByRole('heading', {
        level: 1,
        name: 'Zugang noch nicht freigeschaltet',
      }),
    ).toBeVisible()

    const admin = await login(SEED_ACCOUNTS.admin, '/offices')
    const adminUi = new AdminPageObject(admin.page)
    await adminUi.expectTicketAndAppointmentRoutesForbidden()
    await adminUi.createOffice(scenario.officeName)
    const managerId = await adminUi.promoteUser(
      scenario.manager,
      'Leitung',
      scenario.officeName,
    )
    const officerAId = await adminUi.promoteUser(
      scenario.officerA,
      'Sachbearbeitung',
      scenario.officeName,
    )
    const officerBId = await adminUi.promoteUser(
      scenario.officerB,
      'Sachbearbeitung',
      scenario.officeName,
    )
    expect(new Set([managerId, officerAId, officerBId]).size).toBe(3)

    // The already authenticated citizen session must observe the admin-side role
    // transition from the real backend before it can enter authority routes.
    await officerA.page
      .getByRole('button', { name: 'Zugang erneut prüfen' })
      .click()
    await expect(officerA.page).toHaveURL(/\/$/)
    await expect(
      officerA.page.getByRole('navigation', { name: 'Hauptnavigation' }),
    ).toBeVisible()

    const manager = await login(scenario.manager, '/tickets')
    const officerB = await login(scenario.officerB, '/tickets')
    const dispatcher = await login(SEED_ACCOUNTS.dispatcher, '/tickets')
    const foreignOfficer = await login(SEED_ACCOUNTS.bauamtOfficer, '/tickets')
    const foreignManager = await login(SEED_ACCOUNTS.bauamtManager, '/tickets')

    // Before dispatch, the newly promoted case workers have no object access to
    // the seed ticket. The dispatcher alone sees the routing-stage command.
    const dispatcherTickets = new TicketPageObject(dispatcher.page)
    const ticketId = await dispatcherTickets.openByTitle(SEED_NEW_TICKET_TITLE)
    await expect(
      dispatcher.page.getByRole('button', { name: 'Behörde zuordnen' }),
    ).toBeVisible()
    await new TicketPageObject(officerA.page).expectDirectAccessDenied(ticketId)
    await new TicketPageObject(officerB.page).expectDirectAccessDenied(ticketId)

    await dispatcherTickets.dispatchToOffice(scenario.officeName)

    // The manager sees every ticket of the own office and assigns the primary
    // case worker. A same-office officer remains hidden until explicitly involved.
    const managerTickets = new TicketPageObject(manager.page)
    await managerTickets.openByTitle(SEED_NEW_TICKET_TITLE)
    await managerTickets.assignPrimaryOfficer(officerAId)
    await new TicketPageObject(officerB.page).expectDirectAccessDenied(ticketId)

    const officerATickets = new TicketPageObject(officerA.page)
    const officerBTickets = new TicketPageObject(officerB.page)
    const officerADisplayName =
      `${scenario.officerA.firstName} ${scenario.officerA.lastName}`
    const officerBDisplayName =
      `${scenario.officerB.firstName} ${scenario.officerB.lastName}`

    // Current responsibility can move between officers without changing the
    // permanent primary officer. After B forwards back, B loses object access.
    await officerATickets.openByTitle(SEED_NEW_TICKET_TITLE)
    await officerATickets.forwardTo(officerBId, officerBDisplayName)
    await officerBTickets.openByTitle(SEED_NEW_TICKET_TITLE)
    await officerBTickets.forwardTo(officerAId, officerADisplayName)
    await officerBTickets.expectDirectAccessDenied(ticketId)

    await officerATickets.openByTitle(SEED_NEW_TICKET_TITLE)
    await officerATickets.requestCosignature(officerBId)

    // The requested officer becomes a temporary participant, can cosign, and
    // loses workflow authority again after responsibility returns to Officer A.
    await officerBTickets.openByTitle(SEED_NEW_TICKET_TITLE)
    await officerBTickets.cosign()
    await officerBTickets.expectNoWorkflowActions()
    await officerBTickets.expectDirectAccessDenied(ticketId)

    await officerATickets.openByTitle(SEED_NEW_TICKET_TITLE)
    await officerATickets.escalate(managerId)
    await expect(
      officerA.page.getByRole('group', { name: 'Verfügbare Ticketaktionen' }),
    ).toContainText('keine Workflowaktionen')

    await managerTickets.openByTitle(SEED_NEW_TICKET_TITLE)
    await managerTickets.approveEscalation()

    await officerATickets.openByTitle(SEED_NEW_TICKET_TITLE)
    await officerATickets.addInternalNote(
      'Full-Stack-E2E: interne Dokumentation vor dem Abschluss.',
    )
    await officerATickets.complete(
      'Das Full-Stack-Testanliegen wurde fachlich geprüft und abgeschlossen.',
    )
    await officerATickets.expectEventHistoryContains(
      'Ticket disponiert',
      'Primärer Bearbeiter zugewiesen',
      'Ticket weitergeleitet',
      'Mitzeichnung angefordert',
      'Ticket mitgezeichnet',
      'Ticket eskaliert',
      'Eskalation genehmigt',
      'Full-Stack-E2E: Vorgehen genehmigt.',
      'Ticket abgeschlossen',
    )

    // A foreign-office officer must not receive the internal ticket projection,
    // even when the concrete UUID is known from another authenticated browser.
    await new TicketPageObject(foreignOfficer.page).expectDirectAccessDenied(
      ticketId,
    )
    await new TicketPageObject(foreignManager.page).expectDirectAccessDenied(
      ticketId,
    )

    // A real Office-B officer creates an Info with an actual binary image. A
    // foreign-office officer may read public content but not open its edit flow.
    const info = new InfoPageObject(officerB.page)
    const infoId = await info.createWithImage(scenario.infoTitle, {
      buffer: VALID_PNG,
      filename: 'fullstack-info.png',
    })
    await info.publishCurrent()
    await new InfoPageObject(foreignOfficer.page).expectEditForbidden(infoId)
    await info.editDescription(
      'Full-Stack-E2E: aktualisierte Beschreibung nach erfolgreichem Upload.',
    )

    // The seeded Bauamt officer exercises the second event-sourced aggregate,
    // including a real lifecycle transition and authenticated binary document I/O.
    const appointments = new AppointmentPageObject(foreignOfficer.page)
    await appointments.openScheduledByReason(SEED_SCHEDULED_APPOINTMENT_REASON)
    await appointments.rescheduleToNextAvailableSlot()
    await appointments.uploadNewPdf('fullstack-appointment-notice.pdf', VALID_PDF)
    await appointments.downloadPdf('fullstack-appointment-notice.pdf', VALID_PDF)

    // Capability guards are checked with real authority tokens, not mocked users.
    await expectForbidden(dispatcher.page, '/appointments')
    await expectForbidden(officerA.page, `/users/${managerId}/edit`)

    // Finish the CRUD story only after all cross-account read/authorization
    // assertions have observed the created Info.
    await officerB.page.goto(`/infos/${infoId}`)
    await info.deleteCurrent()
    await officerB.page.goto(`/infos/${infoId}`)
    await expect(officerB.page.getByText('Mitteilung nicht verfügbar')).toBeVisible()
    await officerB.page.goto('/infos')
    const search = officerB.page.getByRole('searchbox', {
      name: 'Mitteilungen suchen',
    })
    await search.fill(scenario.infoTitle)
    await search.press('Enter')
    await expect(
      officerB.page.getByRole('link', { exact: true, name: scenario.infoTitle }),
    ).toHaveCount(0)
  } finally {
    await closeSessions(sessions)
  }
})

async function closeSessions(
  sessions: readonly Readonly<{ context: BrowserContext }>[],
) {
  await Promise.allSettled(sessions.map(({ context }) => context.close()))
}
