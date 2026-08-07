import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { MediaGallery } from '@/shared/media/MediaGallery'
import type { MediaAsset } from '@/shared/media/media-model'
import { renderWithProviders } from '@/test/render'

const assets: readonly MediaAsset[] = [
  {
    altText: 'Erstes veröffentlichtes Bild',
    height: 600,
    id: 'image-1',
    isCover: true,
    mimeType: 'image/png',
    originalFilename: 'erstes.png',
    sizeBytes: 1200,
    uploadedAt: '2026-08-01T08:00:00Z',
    url: '/images/1',
    width: 800,
  },
  {
    altText: 'Zweites veröffentlichtes Bild',
    height: 600,
    id: 'image-2',
    isCover: false,
    mimeType: 'image/png',
    originalFilename: 'zweites.png',
    sizeBytes: 1200,
    uploadedAt: '2026-08-01T08:00:00Z',
    url: '/images/2',
    width: 800,
  },
]

describe('MediaGallery', () => {
  it('exposes a named carousel and positional slide semantics', () => {
    renderWithProviders(<MediaGallery assets={assets} layout="carousel" />)

    const carousel = screen.getByRole('region', {
      name: 'Bilder der Mitteilung',
    })
    expect(carousel).toHaveAttribute('aria-roledescription', 'Karussell')
    expect(
      within(carousel).getByRole('group', { name: '1 von 2' }),
    ).toHaveAttribute('aria-roledescription', 'Folie')
    expect(
      within(carousel).getByRole('group', { name: '2 von 2' }),
    ).toHaveAttribute('aria-roledescription', 'Folie')
  })

  it('navigates the full-size preview and restores trigger focus', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MediaGallery assets={assets} layout="carousel" />)

    const trigger = screen.getByRole('button', {
      name: 'Bild vergrößern: Erstes veröffentlichtes Bild',
    })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Bildvorschau' })
    await user.click(
      within(dialog).getByRole('button', { name: 'Nächstes Bild anzeigen' }),
    )
    expect(
      within(dialog).getByText('Zweites veröffentlichtes Bild'),
    ).toBeVisible()

    await user.click(
      within(dialog).getByRole('button', { name: 'Bildvorschau schließen' }),
    )
    expect(trigger).toHaveFocus()
  })
})
