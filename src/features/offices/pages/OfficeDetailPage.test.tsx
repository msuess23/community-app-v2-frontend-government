import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { OfficeDetailPage } from '@/features/offices/pages/OfficeDetailPage'
import { ConfirmationProvider } from '@/shared/confirmation/ConfirmationProvider'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { mockApiServer } from '@/test/server'

const ADMIN_USER: AuthUser = {
  email: 'admin@example.com',
  firstName: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}

const OFFICE_ID = '00000000-0000-4000-8000-000000000010'

describe('OfficeDetailPage', () => {
  it('shows accessible master data and administrator lifecycle actions', async () => {
    mockApiServer.use(
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json(officeResponse()),
      ),
    )

    renderDetail()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ordnungsamt' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'ordnung@example.com' }),
    ).toHaveAttribute('href', 'mailto:ordnung@example.com')
    expect(
      screen.getByRole('link', { name: '+49 341 123456' }),
    ).toHaveAttribute('href', 'tel:+49341123456')
    expect(screen.getByText('Musterstraße 12a')).toBeVisible()
    expect(screen.getByText('Fundbüro')).toBeVisible()
    expect(screen.queryByText('Breitengrad')).not.toBeInTheDocument()
    expect(screen.queryByText('Längengrad')).not.toBeInTheDocument()
    expect(screen.queryByText('Behörden-ID')).not.toBeInTheDocument()
    expect(
      screen.getByRole('navigation', {
        name: 'Abschnitte dieser Detailansicht',
      }),
    ).toHaveClass('lg:hidden')

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
    expect(
      screen.getByRole('link', { name: 'Änderungshistorie' }),
    ).toHaveAttribute('href', `/offices/${OFFICE_ID}/history`)
    expect(
      screen.getByRole('button', { name: 'Behörde deaktivieren' }),
    ).toBeVisible()
  })

  it('deactivates an office with an audit reason and reloads the server state', async () => {
    const user = userEvent.setup()
    let deactivated = false
    let requestBody: unknown

    mockApiServer.use(
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json(
          officeResponse({
            deactivatedAt: deactivated ? '2026-08-03T10:00:00Z' : null,
            isActive: !deactivated,
          }),
        ),
      ),
      http.delete(
        `http://localhost/api/v1/offices/${OFFICE_ID}`,
        async ({ request }) => {
          requestBody = await request.json()
          deactivated = true
          return new HttpResponse(null, { status: 204 })
        },
      ),
    )

    renderDetail()

    await user.click(
      await screen.findByRole('button', { name: 'Behörde deaktivieren' }),
    )
    expect(screen.getByText('Ausgewählte Behörde')).toBeVisible()
    expect(screen.getByText(/Eine Reaktivierung/)).toBeVisible()
    await user.type(
      screen.getByRole('textbox', { name: /Änderungsgrund/ }),
      'Behördenstandort dauerhaft geschlossen',
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Behörde endgültig deaktivieren',
      }),
    )

    expect(requestBody).toEqual({
      change_reason: 'Behördenstandort dauerhaft geschlossen',
    })
    expect(await screen.findByText('Behörde deaktiviert')).toBeVisible()
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Behörde deaktivieren' }),
      ).not.toBeInTheDocument(),
    )
    expect(
      screen.queryByRole('link', { name: 'Behörde bearbeiten' }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByText('Deaktiviert').length).toBeGreaterThan(0)
  })

  it('links an active-user conflict to the filtered user directory', async () => {
    const user = userEvent.setup()

    mockApiServer.use(
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json(officeResponse()),
      ),
      http.delete(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json(
          {
            error_code: 'OFFICE_HAS_ACTIVE_USERS',
            message: 'Active users remain assigned.',
          },
          { status: 409 },
        ),
      ),
    )

    renderDetail()

    await user.click(
      await screen.findByRole('button', { name: 'Behörde deaktivieren' }),
    )
    await user.type(
      screen.getByRole('textbox', { name: /Änderungsgrund/ }),
      'Standort wird geschlossen',
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Behörde endgültig deaktivieren',
      }),
    )

    expect(
      await screen.findByRole('link', { name: 'Aktive Benutzer anzeigen' }),
    ).toHaveAttribute(
      'href',
      `/users?office=${OFFICE_ID}&status=active`,
    )
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
      <FeedbackProvider>
        <ConfirmationProvider>
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
                <Route
                  path="offices/:officeId"
                  element={<OfficeDetailPage />}
                />
              </Routes>
            </MemoryRouter>
          </AuthContext.Provider>
        </ConfirmationProvider>
      </FeedbackProvider>
    </QueryClientProvider>,
  )
}

/** Creates a backend-compatible office response with configurable lifecycle metadata. */
function officeResponse(
  lifecycle: Readonly<{
    deactivatedAt: string | null
    isActive: boolean
  }> = { deactivatedAt: null, isActive: true },
) {
  return {
    address: {
      city: 'Leipzig',
      house_number: '12a',
      id: '00000000-0000-4000-8000-000000000020',
      latitude: 51.3397,
      longitude: 12.3731,
      street: 'Musterstraße',
      zip_code: '04109',
    },
    contact_email: 'ordnung@example.com',
    description: 'Zentrale Anlaufstelle\nfür kommunale Anliegen.',
    id: OFFICE_ID,
    metadata: {
      created_at: '2026-08-01T10:00:00Z',
      deactivated_at: lifecycle.deactivatedAt,
      is_active: lifecycle.isActive,
    },
    name: 'Ordnungsamt',
    opening_hours: {
      monday: '08:00-12:00, 13:00-16:00',
      saturday: 'geschlossen',
    },
    phone: '+49 341 123456',
    services: ['Fundbüro', 'Gewerbeangelegenheiten'],
  }
}
