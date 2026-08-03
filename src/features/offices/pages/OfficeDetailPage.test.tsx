import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { OfficeDetailPage } from '@/features/offices/pages/OfficeDetailPage'
import { mockApiServer } from '@/test/server'

const ADMIN_USER: AuthUser = {
  email: 'admin@example.test',
  firstName: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}

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
    expect(
      screen.getByRole('link', { name: 'Behörde bearbeiten' }),
    ).toHaveAttribute('href', `/offices/${OFFICE_ID}/edit`)
  })
})

/** Renders one office detail route with an explicit list-return state. */
function renderDetail() {
  const authValue: AuthContextValue = {
    isAuthenticated: true,
    isInitializing: false,
    login: vi.fn(async () => ADMIN_USER),
    logout: vi.fn(async () => undefined),
    logoutAll: vi.fn(async () => undefined),
    refreshCurrentUser: vi.fn(async () => ADMIN_USER),
    register: vi.fn(async () => ADMIN_USER),
    state: { status: 'authenticated', user: ADMIN_USER },
    updateCurrentUser: vi.fn(async () => ADMIN_USER),
    user: ADMIN_USER,
  }

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthContext.Provider value={authValue}>
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
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}
