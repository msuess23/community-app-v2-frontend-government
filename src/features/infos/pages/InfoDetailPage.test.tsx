import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { InfoDetailPage } from '@/features/infos/pages/InfoDetailPage'
import { mockApiServer } from '@/test/server'

const INFO_ID = '00000000-0000-4000-8000-000000000100'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'

describe('InfoDetailPage', () => {
  it('renders accessible images, address and the simple public status history', async () => {
    const user = userEvent.setup()

    mockApiServer.use(
      http.get(`http://localhost/api/v1/infos/${INFO_ID}`, () =>
        HttpResponse.json(infoResponse()),
      ),
      http.get(`http://localhost/api/v1/infos/${INFO_ID}/images`, () =>
        HttpResponse.json([imageResponse()]),
      ),
      http.get(`http://localhost/api/v1/infos/${INFO_ID}/status`, () =>
        HttpResponse.json([
          infoResponse().current_status,
          {
            created_at: '2026-08-01T08:00:00Z',
            id: 'status-created',
            message: 'Created',
            status: 'SCHEDULED',
          },
        ]),
      ),
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json(officeResponse()),
      ),
    )

    renderDetail()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Stadtteilfest' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Musterstraße 12a')).toBeVisible()
    expect(await screen.findByRole('link', { name: 'Ordnungsamt' })).toHaveAttribute(
      'href',
      `/offices/${OFFICE_ID}`,
    )
    expect(screen.queryByText('Breitengrad')).not.toBeInTheDocument()
    expect(screen.queryByText('Längengrad')).not.toBeInTheDocument()
    expect(screen.queryByText(INFO_ID)).not.toBeInTheDocument()

    const gallery = await screen.findByRole('list', {
      name: 'Bilder der Mitteilung',
    })
    expect(
      within(gallery).getByRole('img', {
        name: 'Bühne und Informationsstände auf dem Leipziger Markt',
      }),
    ).toBeVisible()
    expect(within(gallery).getByText('Titelbild')).toBeVisible()

    const statusRegion = screen.getByRole('region', { name: 'Statusverlauf' })
    expect(within(statusRegion).getByText('Findet wie geplant statt.')).toBeVisible()
    expect(within(statusRegion).getByText('Created')).toBeVisible()
    expect(within(statusRegion).queryByText(/ausgeführt von/i)).not.toBeInTheDocument()

    await user.click(
      within(gallery).getByRole('button', {
        name: 'Bild vergrößern: Bühne und Informationsstände auf dem Leipziger Markt',
      }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Bildvorschau' })
    expect(
      within(dialog).getByRole('img', {
        name: 'Bühne und Informationsstände auf dem Leipziger Markt',
      }),
    ).toBeVisible()
    await user.click(
      within(dialog).getByRole('button', { name: 'Bildvorschau schließen' }),
    )
    expect(
      screen.queryByRole('dialog', { name: 'Bildvorschau' }),
    ).not.toBeInTheDocument()
  })
})

function renderDetail() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: `/infos/${INFO_ID}`,
            state: { from: '/infos?search=stadtfest' },
          },
        ]}
      >
        <Routes>
          <Route path="infos/:infoId" element={<InfoDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function infoResponse() {
  return {
    address: {
      city: 'Leipzig',
      house_number: '12a',
      id: 'address-1',
      latitude: 51.34,
      longitude: 12.37,
      street: 'Musterstraße',
      zip_code: '04109',
    },
    category: 'EVENT',
    created_at: '2026-08-01T08:00:00Z',
    current_status: {
      created_at: '2026-08-02T08:00:00Z',
      id: 'status-active',
      message: 'Findet wie geplant statt.',
      status: 'ACTIVE',
    },
    description: 'Sommerfest mit Bühnenprogramm.',
    ends_at: '2026-08-12T20:00:00Z',
    id: INFO_ID,
    image_url: `/api/v1/infos/${INFO_ID}/images/image-1/content`,
    office_id: OFFICE_ID,
    starts_at: '2026-08-12T15:00:00Z',
    title: 'Stadtteilfest',
    updated_at: '2026-08-02T08:00:00Z',
  }
}

function imageResponse() {
  return {
    alt_text: 'Bühne und Informationsstände auf dem Leipziger Markt',
    height: 800,
    id: 'image-1',
    info_id: INFO_ID,
    is_cover: true,
    mime_type: 'image/webp',
    original_filename: 'markt.webp',
    size_bytes: 123456,
    uploaded_at: '2026-08-01T08:00:00Z',
    url: `/api/v1/infos/${INFO_ID}/images/image-1/content`,
    width: 1200,
  }
}

function officeResponse() {
  return {
    address: null,
    contact_email: 'ordnung@example.test',
    description: null,
    id: OFFICE_ID,
    metadata: {
      created_at: '2026-01-01T08:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    name: 'Ordnungsamt',
    opening_hours: null,
    phone: null,
    services: [],
  }
}
