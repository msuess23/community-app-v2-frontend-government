import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { OfficeDetailPage } from '@/features/offices/pages/OfficeDetailPage'
import { mockApiServer } from '@/test/server'

const OFFICE_ID = '00000000-0000-4000-8000-000000000010'

describe('OfficeDetailPage', () => {
  it('shows accessible contact, address, services and weekly opening hours', async () => {
    mockApiServer.use(
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json({
          address: {
            city: 'Leipzig',
            house_number: '12a',
            id: '00000000-0000-4000-8000-000000000020',
            latitude: 51.3397,
            longitude: 12.3731,
            street: 'Musterstraße',
            zip_code: '04109',
          },
          contact_email: 'ordnung@example.test',
          description: 'Zentrale Anlaufstelle\nfür kommunale Anliegen.',
          id: OFFICE_ID,
          metadata: {
            created_at: '2026-08-01T10:00:00Z',
            deactivated_at: null,
            is_active: true,
          },
          name: 'Ordnungsamt',
          opening_hours: {
            monday: '08:00-12:00, 13:00-16:00',
            saturday: 'geschlossen',
          },
          phone: '+49 341 123456',
          services: ['Fundbüro', 'Gewerbeangelegenheiten'],
        }),
      ),
    )

    renderDetail()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ordnungsamt' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'ordnung@example.test' }),
    ).toHaveAttribute('href', 'mailto:ordnung@example.test')
    expect(
      screen.getByRole('link', { name: '+49 341 123456' }),
    ).toHaveAttribute('href', 'tel:+49341123456')
    expect(screen.getByText('Musterstraße 12a')).toBeVisible()
    expect(screen.getByText('Fundbüro')).toBeVisible()

    const openingHours = screen.getByRole('region', {
      name: 'Öffnungszeiten',
    })
    expect(within(openingHours).getByText('Montag')).toBeVisible()
    expect(within(openingHours).getByText('08:00–12:00 Uhr')).toBeVisible()
    expect(within(openingHours).getByText('13:00–16:00 Uhr')).toBeVisible()
    expect(within(openingHours).getByText('Geschlossen')).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Zurück zum Behördenverzeichnis' }),
    ).toHaveAttribute('href', '/offices?search=ordnung')
  })
})

/** Renders one office detail route with an explicit list-return state. */
function renderDetail() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: `/offices/${OFFICE_ID}`,
            state: { from: '/offices?search=ordnung' },
          },
        ]}
      >
        <Routes>
          <Route path="offices/:officeId" element={<OfficeDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
