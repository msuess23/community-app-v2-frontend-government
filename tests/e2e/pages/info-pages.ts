import { expect, type Locator, type Page } from '@playwright/test'

export type BrowserImageFile = Readonly<{
  altText: string
  buffer: Buffer
  filename: string
}>

/** Encapsulates stable selectors and interactions for the Info directory. */
export class InfoDirectoryPageObject {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { level: 1, name: 'Mitteilungen' }),
    ).toBeVisible()
  }

  async openCreate(): Promise<void> {
    await this.page.getByRole('link', { name: 'Mitteilung anlegen' }).click()
  }

  async search(value: string): Promise<void> {
    const searchbox = this.page.getByRole('searchbox', {
      name: 'Mitteilungen suchen',
    })
    await searchbox.fill(value)
    await searchbox.press('Enter')
    await this.expectSearchParam('search', value)
    await expect(searchbox).toBeFocused()
  }

  async setFilters({
    category,
    sort,
    status,
  }: Readonly<{
    category: string
    sort: string
    status: string
  }>): Promise<void> {
    const filterButton = this.page.getByRole('button', {
      name: /Mitteilungen filtern und sortieren/,
    })
    if (await filterButton.isVisible()) {
      await filterButton.click()
    }
    await this.page
      .getByRole('combobox', { name: 'Kategorie' })
      .selectOption(category)
    await this.expectSearchParam('category', category)
    await this.page
      .getByRole('combobox', { name: 'Status' })
      .selectOption(status)
    await this.expectSearchParam('status', status)
    await this.page
      .getByRole('combobox', { name: 'Sortierung' })
      .selectOption(sort)
    const [sortBy, sortDirection] = sort.split(':')
    await this.expectSearchParam('sortBy', sortBy ?? null)
    await this.expectSearchParam('sortDirection', sortDirection ?? null)
  }

  async openInfo(title: string): Promise<void> {
    const links = this.page.getByRole('link', { exact: true, name: title })
    let visibleIndex = -1

    await expect
      .poll(async () => {
        visibleIndex = await findVisibleLinkIndex(links)
        return visibleIndex
      })
      .toBeGreaterThanOrEqual(0)

    await links.nth(visibleIndex).click()
  }

  private async expectSearchParam(
    name: string,
    value: string | null,
  ): Promise<void> {
    await expect
      .poll(() => new URL(this.page.url()).searchParams.get(name))
      .toBe(value)
  }
}

async function findVisibleLinkIndex(candidates: Locator): Promise<number> {
  for (let index = 0; index < (await candidates.count()); index += 1) {
    if (await candidates.nth(index).isVisible()) {
      return index
    }
  }

  return -1
}

/** Encapsulates the shared Info create/edit form and its image queue. */
export class InfoEditorPageObject {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectCreateLoaded(): Promise<void> {
    await expect(
      this.page.getByRole('heading', {
        level: 1,
        name: 'Mitteilung anlegen',
      }),
    ).toBeVisible()
  }

  async fillCreateMasterData({
    category,
    endsAt,
    officeId,
    startsAt,
    title,
  }: Readonly<{
    category: string
    endsAt: string
    officeId: string
    startsAt: string
    title: string
  }>): Promise<void> {
    await this.page.getByRole('textbox', { name: /Titel/ }).fill(title)
    await this.page
      .getByRole('combobox', { name: /Kategorie/ })
      .selectOption(category)
    await this.page
      .getByRole('combobox', { name: 'Zuständige Behörde' })
      .selectOption(officeId)
    await this.page.getByLabel('Beginn').fill(startsAt)
    await this.page.getByLabel('Ende').fill(endsAt)
  }

  async fillAddress({
    city,
    houseNumber,
    street,
    zipCode,
  }: Readonly<{
    city: string
    houseNumber: string
    street: string
    zipCode: string
  }>): Promise<void> {
    const checkbox = this.page.getByRole('checkbox', {
      name: 'Adresse hinterlegen',
    })
    await checkbox.focus()
    await checkbox.press('Space')
    await expect(checkbox).toBeChecked()
    await this.page.getByRole('textbox', { name: /Straße/ }).fill(street)
    await this.page
      .getByRole('textbox', { name: /Hausnummer/ })
      .fill(houseNumber)
    await this.page
      .getByRole('textbox', { name: /Postleitzahl/ })
      .fill(zipCode)
    await this.page.getByRole('textbox', { name: /Ort/ }).fill(city)
  }

  async selectImages(files: readonly BrowserImageFile[]): Promise<void> {
    await this.page.getByLabel('Bilddateien auswählen').setInputFiles(
      files.map(({ buffer, filename }) => ({
        buffer,
        mimeType: 'image/png',
        name: filename,
      })),
    )

    for (const file of files) {
      await this.page
        .getByRole('textbox', {
          name: `Alternativtext für ${file.filename}`,
        })
        .fill(file.altText)
    }
  }

  async markProspectiveCover(filename: string): Promise<void> {
    await this.page
      .getByRole('button', {
        name: `Als Titelbild vormerken: ${filename}`,
      })
      .click()
  }

  async submitCreate(): Promise<void> {
    await this.page.getByRole('button', { name: 'Mitteilung anlegen' }).click()
  }

  async updateDescription(value: string): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Beschreibung' }).fill(value)
    await this.page
      .getByRole('button', { name: 'Änderungen speichern' })
      .click()
  }

  async uploadQueuedImages(): Promise<void> {
    await this.page.getByRole('button', { name: 'Bilder hochladen' }).click()
  }
}

/** Encapsulates read-only Info detail and lifecycle actions. */
export class InfoDetailPageObject {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectLoaded(title: string): Promise<void> {
    await expect(
      this.page.getByRole('heading', { level: 1, name: title }),
    ).toBeVisible()
  }

  async openEdit(): Promise<void> {
    await this.page.getByRole('link', { name: 'Mitteilung bearbeiten' }).click()
  }

  async publishStatus(status: string, message: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Status aktualisieren' }).click()
    const dialog = this.page.getByRole('dialog', {
      name: 'Status aktualisieren',
    })
    await dialog
      .getByRole('combobox', { name: /Neuer Status/ })
      .selectOption(status)
    await dialog
      .getByRole('textbox', { name: 'Öffentliche Nachricht' })
      .fill(message)
    await dialog
      .getByRole('button', { name: 'Status veröffentlichen' })
      .click()
  }

  async deleteInfo(): Promise<void> {
    await this.page.getByRole('button', { name: 'Mitteilung löschen' }).click()
    await this.page
      .getByRole('dialog', { name: 'Mitteilung endgültig löschen' })
      .getByRole('button', { name: 'Mitteilung endgültig löschen' })
      .click()
  }
}
