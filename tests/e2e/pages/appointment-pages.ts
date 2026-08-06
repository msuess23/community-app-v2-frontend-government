import { expect, type Locator, type Page } from '@playwright/test'

import { APPOINTMENT_ID } from '../fixtures/appointment-api.js'

export class AppointmentDirectoryPageObject {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { level: 1, name: 'Termine' }),
    ).toBeVisible()
    await expect(await this.getVisibleAppointmentLink()).toBeVisible()
  }

  async selectStatus(value: string): Promise<void> {
    const mobileFilterTrigger = this.page.getByRole('button', {
      name: /Termine filtern und sortieren/,
    })
    if (await mobileFilterTrigger.isVisible()) {
      await mobileFilterTrigger.click()
    }
    await this.page.getByLabel('Status').selectOption(value)
  }

  async openFirstAppointment(): Promise<void> {
    await (await this.getVisibleAppointmentLink()).click()
    await expect(this.page).toHaveURL(
      new RegExp(`/appointments/${APPOINTMENT_ID}$`),
    )
  }

  private async getVisibleAppointmentLink(): Promise<Locator> {
    const links = this.page.locator(`a[href="/appointments/${APPOINTMENT_ID}"]`)
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

export class AppointmentDetailPageObject {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole('heading', {
        level: 1,
        name: 'Termin mit Clara Bürgerin',
      }),
    ).toBeVisible()
    await expect(
      this.page.getByRole('region', { name: 'Terminplanung' }),
    ).toContainText('12.08.2026')
    await expect(
      this.page.getByRole('region', { name: 'Beteiligte' }),
    ).toContainText('Bürgeramt Mitte')
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
