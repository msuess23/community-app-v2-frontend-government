import { expect, test } from '@playwright/test'

import { expectNoSeriousAccessibilityViolations } from './fixtures/accessibility'
import { signInAsAuthorityUser } from './fixtures/auth'
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
  role: 'OFFICER' as const,
}

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

test('officer appends comments and manages revisioned ticket images', async ({
  page,
}) => {
  const {
    commentRequests,
    imageCoverRequests,
    imageRemovalRequests,
    imageUploadNames,
  } = await installTicketReadApi(page)
  const directory = new TicketDirectoryPageObject(page)
  const detail = new TicketDetailPageObject(page)

  await signInAsAuthorityUser(page, '/tickets', officer)
  await directory.openFirstTicket()
  await detail.expectLoaded()

  await detail.addInternalNote('Bitte zunächst intern abstimmen.')
  await detail.addPublicComment('Die Absicherung ist für morgen vorgesehen.')
  await detail.uploadTicketImages([
    {
      buffer: Buffer.from('first-image'),
      mimeType: 'image/jpeg',
      name: 'neue-aufnahme.jpg',
    },
    {
      buffer: Buffer.from('second-image'),
      mimeType: 'image/png',
      name: 'detailaufnahme.png',
    },
  ])
  await detail.setCover('schlagloch-detail.jpg')
  await detail.removeImage(
    'schlagloch-detail.jpg',
    'Doppelte Perspektive ohne Zusatznutzen',
  )

  expect(commentRequests).toEqual([
    { is_internal: true, text: 'Bitte zunächst intern abstimmen.' },
    {
      is_internal: false,
      text: 'Die Absicherung ist für morgen vorgesehen.',
    },
  ])
  expect(imageUploadNames).toEqual([
    'neue-aufnahme.jpg',
    'detailaufnahme.png',
  ])
  expect(imageCoverRequests).toEqual(['image-secondary'])
  expect(imageRemovalRequests).toEqual([
    {
      imageId: 'image-secondary',
      reason: 'Doppelte Perspektive ohne Zusatznutzen',
    },
  ])
  await expect(
    page.getByRole('region', { name: 'Ereignishistorie' }),
  ).toContainText('Interne Notiz hinzugefügt')
  await expect(
    page.getByRole('region', { name: 'Ereignishistorie' }),
  ).toContainText('Bild entfernt')
  await expect(page.getByText('schlagloch-detail.jpg')).toBeVisible()
  await expectNoSeriousAccessibilityViolations(page)
})

test('pending ticket image uploads participate in the unsaved-changes guard', async ({
  page,
}) => {
  await installTicketReadApi(page)
  const directory = new TicketDirectoryPageObject(page)
  const detail = new TicketDetailPageObject(page)

  await signInAsAuthorityUser(page, '/tickets', officer)
  await directory.openFirstTicket()
  await detail.expectLoaded()

  await page.getByLabel('Bilddateien auswählen').setInputFiles({
    buffer: Buffer.from('pending-image'),
    mimeType: 'image/jpeg',
    name: 'noch-nicht-hochgeladen.jpg',
  })
  await page
    .getByRole('link', { name: 'Zurück zum Ticketverzeichnis' })
    .click()

  const dialog = page.getByRole('dialog', { name: 'Bild-Uploads verwerfen?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Weiter bearbeiten' }).click()
  await expect(page).toHaveURL(new RegExp(`/tickets/${TICKET_ID}$`))
  await expect(dialog).toBeHidden()
})
