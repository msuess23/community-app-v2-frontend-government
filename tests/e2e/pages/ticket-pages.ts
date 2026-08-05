import { expect, type Locator, type Page } from '@playwright/test'

import { TICKET_ID } from '../fixtures/ticket-api'

export class TicketDirectoryPageObject {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { level: 1, name: 'Tickets' }),
    ).toBeVisible()
    const links = this.getTicketLinks()
    await expect(links.table.or(links.compact)).toBeVisible()
  }

  async openFirstTicket(): Promise<void> {
    const links = this.getTicketLinks()
    const visibleLink = (await links.table.isVisible())
      ? links.table
      : links.compact

    await visibleLink.click()
    await expect(this.page).toHaveURL(new RegExp(`/tickets/${TICKET_ID}$`))
  }

  async selectWorkflowState(value: string): Promise<void> {
    const mobileFilterTrigger = this.page.getByRole('button', {
      name: /Tickets filtern und sortieren/,
    })

    if (await mobileFilterTrigger.isVisible()) {
      await mobileFilterTrigger.click()
    }

    await this.page.getByLabel('Workflowzustand').selectOption(value)
  }

  private getTicketLinks(): Readonly<{ compact: Locator; table: Locator }> {
    const linkOptions = { name: 'Schlagloch in der Parkstraße' } as const

    return {
      compact: this.page
        .getByRole('list', { name: 'Ticketverzeichnis' })
        .getByRole('link', linkOptions),
      table: this.page
        .getByRole('table', { name: 'Ticketverzeichnis' })
        .getByRole('link', linkOptions),
    }
  }
}

export class TicketDetailPageObject {
  constructor(private readonly page: Page) {}

  async expectLoaded(title = 'Schlagloch in der Parkstraße'): Promise<void> {
    await expect(
      this.page.getByRole('heading', { level: 1, name: title }),
    ).toBeVisible()
    await expect(
      this.page.getByRole('region', { name: 'Aktuelle Zuständigkeit' }),
    ).toContainText('Olaf Ordnung')
    await expect(
      this.page.getByRole('region', { name: 'Ereignishistorie' }),
    ).toContainText('Ticket eingereicht')
    await expect(
      this.page.getByRole('region', { name: 'Kommentare und interne Notizen' }),
    ).toContainText('Interne fachliche Prüfung läuft.')
  }

  async addInternalNote(text: string): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Interne Notiz' }).fill(text)
    await this.page.getByRole('button', { name: 'Notiz speichern' }).click()
    await expect(this.page.getByText('Interne Notiz gespeichert')).toBeVisible()
  }

  async addPublicComment(text: string): Promise<void> {
    await this.page.getByRole('radio', { name: 'Öffentlicher Kommentar' }).click()
    await expect(this.page.getByRole('alert')).toContainText('Öffentlich sichtbar')
    await this.page
      .getByRole('textbox', { name: 'Öffentlicher Kommentar' })
      .fill(text)
    await this.page
      .getByRole('button', { name: 'Kommentar veröffentlichen' })
      .click()
    await expect(
      this.page.getByText('Öffentlichen Kommentar gespeichert'),
    ).toBeVisible()
  }

  async uploadTicketImages(
    files: readonly { buffer: Buffer; mimeType: string; name: string }[],
  ): Promise<void> {
    await this.page.getByLabel('Bilddateien auswählen').setInputFiles(files)
    await this.page.getByRole('button', { name: 'Bilder hochladen' }).click()
    await expect(
      this.page.getByText(
        `${files.length} hochgeladen, 0 fehlgeschlagen, 0 ausstehend`,
      ),
    ).toBeVisible()
  }

  async setCover(filename: string): Promise<void> {
    await this.page
      .getByRole('button', { name: `Als Titelbild verwenden: ${filename}` })
      .click()
    await expect(this.page.getByText('Titelbild aktualisiert')).toBeVisible()
  }

  async removeImage(filename: string, reason: string): Promise<void> {
    await this.page
      .getByRole('button', { name: `Bild entfernen: ${filename}` })
      .click()
    const dialog = this.page.getByRole('dialog', { name: 'Bild entfernen' })
    await dialog.getByRole('textbox', { name: 'Begründung' }).fill(reason)
    await dialog.getByRole('button', { name: 'Bild entfernen' }).click()
    await expect(this.page.getByText('Ticketbild entfernt')).toBeVisible()
    await expect(dialog).toBeHidden()
  }

  async forwardTicketTo(
    targetUserId: string,
    comment: string,
  ): Promise<void> {
    await this.page.getByRole('button', { name: 'Weiterleiten' }).click()
    const dialog = this.page.getByRole('dialog', { name: 'Ticket weiterleiten' })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Weiterleiten an').selectOption(targetUserId)
    await dialog.getByLabel('Optionaler Kommentar').fill(comment)
    await dialog.getByRole('button', { name: 'Ticket weiterleiten' }).click()
    await expect(dialog).toBeHidden()
  }


  async openWorkflowAction(
    actionLabel: string,
    dialogName: string,
  ): Promise<Readonly<{ dialog: Locator; trigger: Locator }>> {
    const trigger = this.page.getByRole('button', { name: actionLabel })
    await trigger.click()
    const dialog = this.page.getByRole('dialog', { name: dialogName })
    await expect(dialog).toBeVisible()

    return { dialog, trigger }
  }

  async expectNoHorizontalOverflow(): Promise<void> {
    await expect
      .poll(() =>
        this.page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      )
      .toBeLessThanOrEqual(1)
  }

  async returnToDirectory(): Promise<void> {
    await this.page
      .getByRole('link', { name: 'Zurück zum Ticketverzeichnis' })
      .click()
  }
}
