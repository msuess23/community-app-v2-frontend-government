import { expect, type Locator, type Page } from '@playwright/test'

import type { FullStackAccount } from '../fixtures/fullstack-environment.js'

export class AdminPageObject {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async createOffice(name: string): Promise<string> {
    await this.page.goto('/offices')
    await this.page.getByRole('link', { name: 'Behörde anlegen' }).click()
    await this.page.getByRole('textbox', { name: 'Name der Behörde' }).fill(name)
    await this.page
      .getByRole('textbox', { name: 'Kontakt-E-Mail-Adresse' })
      .fill(`kontakt-${slug(name)}@example.test`)
    await this.page.getByRole('button', { name: 'Behörde anlegen' }).click()
    await expect(this.page.getByText('Behörde angelegt')).toBeVisible()
    await expect(
      this.page.getByRole('heading', { level: 1, name }),
    ).toBeVisible()

    return extractLastPathSegment(this.page.url())
  }

  async promoteUser(
    account: FullStackAccount,
    roleLabel: 'Leitung' | 'Sachbearbeitung',
    officeName: string,
  ): Promise<string> {
    await this.page.goto('/users')
    const search = this.page.getByRole('searchbox', { name: 'Benutzer suchen' })
    await search.fill(account.email)
    await search.press('Enter')

    const userLink = this.page.getByRole('link', {
      exact: true,
      name: `${account.firstName} ${account.lastName}`,
    })
    await expectVisibleVariant(userLink)
    await (await firstVisible(userLink)).click()
    await expect(this.page).toHaveURL(/\/users\/[^/?]+$/)
    const userId = extractLastPathSegment(this.page.url())

    await this.page.getByRole('link', { name: 'Administrativ bearbeiten' }).click()
    await this.page
      .getByRole('combobox', { name: 'Rolle' })
      .selectOption({ label: roleLabel })
    await this.page
      .getByRole('combobox', { name: /Behörde/ })
      .selectOption({ label: officeName })
    await this.page
      .getByRole('textbox', { name: /Änderungsgrund/ })
      .fill('Full-Stack-E2E: Behördenrolle für den Integrationsablauf vergeben')
    await this.page.getByRole('button', { name: 'Änderungen speichern' }).click()

    await expect(this.page.getByText('Benutzerkonto gespeichert')).toBeVisible()
    await expect(
      this.page.getByText(roleLabel, { exact: true }).first(),
    ).toBeVisible()
    await expect(
      this.page.getByText(officeName, { exact: true }).first(),
    ).toBeVisible()
    return userId
  }

  async expectTicketAndAppointmentRoutesForbidden(): Promise<void> {
    for (const path of ['/tickets', '/appointments']) {
      await this.page.goto(path)
      await expect(this.page).toHaveURL(/\/forbidden$/)
      await expect(
        this.page.getByRole('heading', { level: 1, name: 'Zugriff nicht erlaubt' }),
      ).toBeVisible()
    }
  }
}

export class TicketPageObject {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page
  }

  async openByTitle(title: string): Promise<string> {
    await this.page.goto('/tickets')
    const search = this.page.getByRole('searchbox', { name: 'Tickets suchen' })
    await search.fill(title)
    await search.press('Enter')
    const link = this.page.getByRole('link', { exact: true, name: title })
    await expectVisibleVariant(link)
    await (await firstVisible(link)).click()
    await expect(
      this.page.getByRole('heading', { level: 1, name: title }),
    ).toBeVisible()
    return extractLastPathSegment(this.page.url())
  }

  async dispatchToOffice(officeName: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Behörde zuordnen' }).click()
    const dialog = this.page.getByRole('dialog', {
      name: 'Ticket einer Behörde zuordnen',
    })
    await dialog
      .getByRole('combobox', { name: 'Zuständige Behörde' })
      .selectOption({ label: officeName })
    await dialog.getByLabel('Optionaler Kommentar').fill(
      'Full-Stack-E2E: Zuständigkeit an neu angelegte Behörde übergeben',
    )
    await dialog.getByRole('button', { name: 'Ticket zuordnen' }).click()
    await expect(dialog).toBeHidden()
  }

  async assignPrimaryOfficer(displayName: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Primär zuweisen' }).click()
    const dialog = this.page.getByRole('dialog', {
      name: 'Primären Bearbeiter zuweisen',
    })
    await dialog
      .getByRole('combobox', { name: 'Primärer Bearbeiter' })
      .selectOption({ label: displayName })
    await dialog.getByLabel('Optionaler Kommentar').fill(
      'Full-Stack-E2E: primäre Sachbearbeitung festgelegt',
    )
    await dialog
      .getByRole('button', { name: 'Primären Bearbeiter zuweisen' })
      .click()
    await expect(dialog).toBeHidden()
  }

  async forwardTo(displayName: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Weiterleiten' }).click()
    const dialog = this.page.getByRole('dialog', { name: 'Ticket weiterleiten' })
    await dialog
      .getByRole('combobox', { name: 'Weiterleiten an' })
      .selectOption({ label: displayName })
    await dialog
      .getByLabel('Optionaler Kommentar')
      .fill(`Full-Stack-E2E: aktuelle Bearbeitung an ${displayName} übergeben.`)
    await dialog.getByRole('button', { name: 'Ticket weiterleiten' }).click()
    await expect(dialog).toBeHidden()
  }

  async requestCosignature(displayName: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Mitzeichnung' }).click()
    const dialog = this.page.getByRole('dialog', { name: 'Mitzeichnung anfordern' })
    await dialog
      .getByRole('combobox', { name: 'Mitzeichnung durch' })
      .selectOption({ label: displayName })
    await dialog.getByLabel('Optionaler Kommentar').fill(
      'Bitte fachliche Zweitprüfung im Full-Stack-Szenario durchführen.',
    )
    await dialog.getByRole('button', { name: 'Mitzeichnung anfordern' }).click()
    await expect(dialog).toBeHidden()
  }

  async cosign(): Promise<void> {
    await this.page.getByRole('button', { name: 'Mitzeichnen' }).click()
    const dialog = this.page.getByRole('dialog', { name: 'Ticket mitzeichnen' })
    await dialog.getByLabel('Optionaler Kommentar').fill(
      'Full-Stack-E2E: Zweitprüfung bestätigt.',
    )
    await dialog.getByRole('button', { name: 'Ticket mitzeichnen' }).click()
    await expect(dialog).toBeHidden()
  }

  async escalate(managerDisplayName: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Eskalieren' }).click()
    const dialog = this.page.getByRole('dialog', { name: 'Ticket eskalieren' })
    await dialog
      .getByRole('combobox', { name: 'Entscheidender Manager' })
      .selectOption({ label: managerDisplayName })
    await dialog
      .getByRole('textbox', { name: 'Begründung' })
      .fill('Full-Stack-E2E: Managemententscheidung vor Abschluss erforderlich.')
    await dialog.getByRole('button', { name: 'Eskalation anfordern' }).click()
    await expect(dialog).toBeHidden()
  }

  async approveEscalation(): Promise<void> {
    await this.page
      .getByRole('button', { name: 'Eskalation entscheiden' })
      .click()
    const dialog = this.page.getByRole('dialog', {
      name: 'Eskalation entscheiden',
    })
    await dialog.getByRole('radio', { name: 'Genehmigen' }).click()
    await dialog.getByLabel('Optionaler Kommentar').fill(
      'Full-Stack-E2E: Vorgehen genehmigt.',
    )
    await dialog
      .getByRole('button', { name: 'Entscheidung dokumentieren' })
      .click()
    await expect(dialog).toBeHidden()
  }

  async addInternalNote(text: string): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Interne Notiz' }).fill(text)
    await this.page.getByRole('button', { name: 'Notiz speichern' }).click()
    await expect(this.page.getByText('Interne Notiz gespeichert')).toBeVisible()
  }

  async complete(message: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Abschließen' }).click()
    const dialog = this.page.getByRole('dialog', { name: 'Ticket abschließen' })
    await dialog.getByRole('radio', { name: 'Erledigt' }).click()
    await dialog
      .getByRole('textbox', { name: 'Öffentliche Abschlussnachricht' })
      .fill(message)
    await dialog.getByRole('button', { name: 'Ticket abschließen' }).click()
    const confirmation = this.page.getByRole('dialog', {
      name: 'Ticket wirklich abschließen?',
    })
    await confirmation.getByRole('button', { name: 'Ticket erledigen' }).click()
    await expect(dialog).toBeHidden()
  }

  async expectEventHistoryContains(...labels: string[]): Promise<void> {
    const history = this.page.getByRole('region', { name: 'Ereignishistorie' })
    for (const label of labels) {
      await expect(history).toContainText(label)
    }
  }

  async expectDirectAccessDenied(ticketId: string): Promise<void> {
    const internalPath = `/tickets/${ticketId}/internal`
    const responsePromise = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith(internalPath) &&
        response.request().method() === 'GET',
    )

    await this.page.goto(`/tickets/${ticketId}`)
    const response = await responsePromise
    expect(response.status()).toBe(404)
    await expect(this.page.getByText('Ticket nicht verfügbar')).toBeVisible()
  }

  async expectNoWorkflowActions(): Promise<void> {
    await expect(
      this.page.getByRole('group', { name: 'Verfügbare Ticketaktionen' }),
    ).toContainText('keine Workflowaktionen')
  }
}

export class InfoPageObject {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async createWithImage(
    title: string,
    image: Readonly<{ buffer: Buffer; filename: string }>,
  ): Promise<string> {
    await this.page.goto('/infos/new')
    await this.page.getByRole('textbox', { name: /Titel/ }).fill(title)
    await this.page
      .getByRole('textbox', { name: 'Beschreibung' })
      .fill('Full-Stack-E2E-Mitteilung mit echtem binären Bildupload.')
    await this.page
      .getByRole('combobox', { name: /Kategorie/ })
      .selectOption('EVENT')

    const starts = localDateTimeOffset(-1)
    const ends = localDateTimeOffset(3)
    await this.page.getByLabel('Beginn').fill(starts)
    await this.page.getByLabel('Ende').fill(ends)
    await this.page.getByLabel('Bilddateien auswählen').setInputFiles({
      buffer: image.buffer,
      mimeType: 'image/png',
      name: image.filename,
    })
    await this.page
      .getByRole('textbox', { name: `Alternativtext für ${image.filename}` })
      .fill('Abstrakte Testgrafik zur Full-Stack-Mitteilung')

    await this.page.getByRole('button', { name: 'Mitteilung anlegen' }).click()
    await expect(this.page.getByText('Mitteilung angelegt')).toBeVisible()
    await expect(
      this.page.getByRole('heading', { level: 1, name: title }),
    ).toBeVisible()
    await expect(
      this.page.getByRole('img', {
        name: 'Abstrakte Testgrafik zur Full-Stack-Mitteilung',
      }),
    ).toBeVisible()
    return extractLastPathSegment(this.page.url())
  }

  async publishCurrent(): Promise<void> {
    await this.page.getByRole('button', { name: 'Status aktualisieren' }).click()
    const dialog = this.page.getByRole('dialog', { name: 'Status aktualisieren' })
    await dialog
      .getByRole('combobox', { name: 'Neuer Status' })
      .selectOption('ACTIVE')
    await dialog
      .getByRole('textbox', { name: 'Öffentliche Nachricht' })
      .fill('Full-Stack-E2E: Mitteilung ist jetzt öffentlich aktiv.')
    await dialog.getByRole('button', { name: 'Status veröffentlichen' }).click()
    await expect(dialog).toBeHidden()
    await expect(
      this.page.getByText('Status auf „Aktiv“ gesetzt'),
    ).toBeVisible()
  }

  async editDescription(value: string): Promise<void> {
    await this.page.getByRole('link', { name: 'Mitteilung bearbeiten' }).click()
    await this.page.getByRole('textbox', { name: 'Beschreibung' }).fill(value)
    await this.page.getByRole('button', { name: 'Änderungen speichern' }).click()
    await expect(this.page.getByText('Mitteilung gespeichert')).toBeVisible()
  }

  async deleteCurrent(): Promise<void> {
    await this.page.getByRole('button', { name: 'Mitteilung löschen' }).click()
    const confirmation = this.page.getByRole('dialog', {
      name: 'Mitteilung endgültig löschen',
    })
    await confirmation
      .getByRole('button', { name: 'Mitteilung endgültig löschen' })
      .click()
    await expect(this.page).toHaveURL(/\/infos(?:\?.*)?$/)
  }

  async expectEditForbidden(infoId: string): Promise<void> {
    await this.page.goto(`/infos/${infoId}/edit`)
    await expect(
      this.page.getByRole('heading', { level: 2, name: 'Bearbeitung nicht erlaubt' }),
    ).toBeVisible()
  }
}

export class AppointmentPageObject {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async openScheduledByReason(reason: string): Promise<void> {
    await this.page.goto('/appointments')
    const search = this.page.getByRole('searchbox', { name: 'Termine suchen' })
    await search.fill(reason)
    await search.press('Enter')
    const links = this.page.getByRole('link', {
      name: 'Termin mit Celine Citizen öffnen',
    })
    await expectVisibleVariant(links)
    const visibleLink = await firstVisible(links)
    await visibleLink.click()
    await expect(
      this.page.getByRole('region', { name: 'Terminplanung' }),
    ).toBeVisible()
  }

  async rescheduleToNextAvailableSlot(): Promise<void> {
    await this.page.getByRole('button', { name: 'Verschieben' }).click()
    const dialog = this.page.getByRole('dialog', { name: 'Termin verschieben' })
    const select = dialog.getByRole('combobox', { name: 'Neuer Terminslot' })
    await expect
      .poll(async () => select.locator('option').count())
      .toBeGreaterThan(1)
    const targetSlotId = await select
      .locator('option')
      .nth(1)
      .getAttribute('value')
    if (!targetSlotId) {
      throw new Error('Expected a selectable future appointment slot.')
    }
    await select.selectOption(targetSlotId)
    await dialog
      .getByRole('textbox', { name: 'Begründung' })
      .fill('Full-Stack-E2E: Termin auf einen real freien Slot verschieben.')
    await dialog.getByRole('button', { name: 'Termin verschieben' }).click()
    await expect(dialog).toBeHidden()
    await expect(this.page.getByText('Termin verschoben')).toBeVisible()
    await expect(
      this.page.getByRole('region', { name: 'Ereignishistorie' }),
    ).toContainText('Termin verschoben')
  }

  async uploadNewPdf(filename: string, buffer: Buffer): Promise<void> {
    await this.page.getByRole('button', { name: 'PDF hochladen' }).click()
    const dialog = this.page.getByRole('dialog', {
      name: 'Termindokument hochladen',
    })
    await dialog
      .getByRole('combobox', { name: 'Dokumenttyp' })
      .selectOption('NOTICE')
    await dialog.getByLabel('PDF-Datei').setInputFiles({
      buffer,
      mimeType: 'application/pdf',
      name: filename,
    })
    await dialog.getByRole('button', { name: 'Dokument hochladen' }).click()
    await expect(dialog).toBeHidden()
    await expect(
      this.page.getByRole('region', { name: 'Termindokumente' }).getByText(filename),
    ).toBeVisible()
    await expect(
      this.page.getByRole('region', { name: 'Ereignishistorie' }),
    ).toContainText('Dokumentversion hinzugefügt')
  }

  async downloadPdf(filename: string, expected: Buffer): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download')
    await this.page
      .getByRole('button', {
        name: `Mitteilung – ${filename}, Version 1 herunterladen`,
      })
      .click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe(filename)

    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    expect(Buffer.concat(chunks)).toEqual(expected)
  }
}

export async function expectForbidden(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await expect(page).toHaveURL(/\/forbidden$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Zugriff nicht erlaubt' }),
  ).toBeVisible()
}

async function expectVisibleVariant(locator: Locator): Promise<void> {
  await expect
    .poll(async () => (await firstVisibleIndex(locator)) >= 0)
    .toBe(true)
}

async function firstVisible(locator: Locator): Promise<Locator> {
  const index = await firstVisibleIndex(locator)
  expect(index).toBeGreaterThanOrEqual(0)
  return locator.nth(index)
}

async function firstVisibleIndex(locator: Locator): Promise<number> {
  for (let index = 0; index < (await locator.count()); index += 1) {
    if (await locator.nth(index).isVisible()) return index
  }
  return -1
}

function extractLastPathSegment(url: string): string {
  const segment = new URL(url).pathname.split('/').filter(Boolean).at(-1)
  if (!segment) throw new Error(`Expected resource identifier in URL: ${url}`)
  return segment
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function localDateTimeOffset(days: number): string {
  const value = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate(),
  )}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}
