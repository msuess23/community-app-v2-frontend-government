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

export class AppointmentSlotDirectoryPageObject {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { level: 1, name: 'Terminslots' }),
    ).toBeVisible()
    await expect(
      this.page.getByRole('link', { name: 'Terminslots anlegen' }),
    ).toBeVisible()
  }

  async selectStatus(value: string): Promise<void> {
    const mobileFilterTrigger = this.page.getByRole('button', {
      name: /Terminslots filtern und sortieren/,
    })
    if (await mobileFilterTrigger.isVisible()) {
      await mobileFilterTrigger.click()
    }
    await this.page.getByLabel('Status').selectOption(value)
  }

  async openCreate(): Promise<void> {
    await this.page.getByRole('link', { name: 'Terminslots anlegen' }).click()
    await expect(this.page).toHaveURL(/\/appointments\/slots\/new$/)
  }

  async deactivateFirstAvailableSlot(): Promise<void> {
    const buttons = this.page.getByRole('button', {
      name: /Terminslot am .* deaktivieren/,
    })
    const visibleButton = await getVisibleLocator(buttons)
    await visibleButton.click()
    await this.page
      .getByRole('button', { name: 'Terminslot deaktivieren', exact: true })
      .click()
  }
}

export class AppointmentSlotCreatePageObject {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole('heading', {
        level: 1,
        name: 'Terminslots anlegen',
      }),
    ).toBeVisible()
  }

  async fillTwoUnsortedSlots(): Promise<void> {
    await this.page
      .getByLabel('Beginn von Terminslot 1')
      .fill('2099-08-22T12:00')
    await this.page
      .getByLabel('Ende von Terminslot 1')
      .fill('2099-08-22T12:30')
    await this.page
      .getByRole('button', { name: 'Terminslot hinzufügen' })
      .click()
    await this.page
      .getByLabel('Beginn von Terminslot 2')
      .fill('2099-08-22T09:00')
    await this.page
      .getByLabel('Ende von Terminslot 2')
      .fill('2099-08-22T09:30')
  }

  async submit(): Promise<void> {
    await this.page
      .getByRole('button', { name: '2 Terminslots anlegen' })
      .click()
    await expect(this.page).toHaveURL(/\/appointments\/slots$/)
  }
}

async function getVisibleLocator(candidates: Locator): Promise<Locator> {
  const index = await findVisibleLocatorIndex(candidates)
  expect(index).toBeGreaterThanOrEqual(0)
  return candidates.nth(index)
}
