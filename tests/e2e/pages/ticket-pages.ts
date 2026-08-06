import { expect, type Locator, type Page } from '@playwright/test'

import { TICKET_ID } from '../fixtures/ticket-api.js'

export class TicketDirectoryPageObject {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { level: 1, name: 'Tickets' }),
    ).toBeVisible()
    await expect(await this.getVisibleTicketLink()).toBeVisible()
  }

  async openFirstTicket(): Promise<void> {
    await (await this.getVisibleTicketLink()).click()
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

  private async getVisibleTicketLink(): Promise<Locator> {
    const links = this.page.getByRole('link', {
      exact: true,
      name: 'Schlagloch in der Parkstraße',
    })
    let visibleIndex = -1

    await expect
      .poll(async () => {
        visibleIndex = await findVisibleLocatorIndex(links)
        return visibleIndex
      })
      .toBeGreaterThanOrEqual(0)

    return links.nth(visibleIndex)
  }
}

async function findVisibleLocatorIndex(candidates: Locator): Promise<number> {
  for (let index = 0; index < (await candidates.count()); index += 1) {
    if (await candidates.nth(index).isVisible()) {
      return index
    }
  }

  return -1
}

export class TicketDetailPageObject {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

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

  async forwardTicketTo(
    targetUserId: string,
    comment: string,
  ): Promise<void> {
    await this.page.getByRole('button', { name: 'Weiterleiten' }).click()
    const dialog = this.page.getByRole('dialog', { name: 'Ticket weiterleiten' })
    await expect(dialog).toBeVisible()
    await dialog
      .getByRole('combobox', { name: /Weiterleiten an/ })
      .selectOption(targetUserId)
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
        this.page.evaluate(() => {
          const browser = globalThis as unknown as {
            document: {
              documentElement: { clientWidth: number; scrollWidth: number }
            }
          }
          return (
            browser.document.documentElement.scrollWidth -
            browser.document.documentElement.clientWidth
          )
        }),
      )
      .toBeLessThanOrEqual(1)
  }

  async returnToDirectory(): Promise<void> {
    await this.page
      .getByRole('link', { name: 'Zurück zum Ticketverzeichnis' })
      .click()
  }
}
