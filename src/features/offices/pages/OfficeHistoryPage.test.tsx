import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { OfficeHistoryPage } from '@/features/offices/pages/OfficeHistoryPage'
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

describe('OfficeHistoryPage', () => {
  it('renders expandable snapshots and sends timezone-aware date filters', async () => {
    const user = userEvent.setup()
    let requestedRange: URLSearchParams | undefined

    mockApiServer.use(
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json(officeResponse()),
      ),
      http.get(`http://localhost/api/v1/users/${ADMIN_USER.id}`, () =>
        HttpResponse.json({
          email: ADMIN_USER.email,
          first_name: ADMIN_USER.firstName,
          id: ADMIN_USER.id,
          last_name: ADMIN_USER.lastName,
          metadata: {
            created_at: '2026-01-01T00:00:00Z',
            deactivated_at: null,
            is_active: true,
          },
          office_id: null,
          role: 'ADMIN',
        }),
      ),
      http.get(
        `http://localhost/api/v1/offices/${OFFICE_ID}/history`,
        ({ request }) => {
          requestedRange = new URL(request.url).searchParams
          return HttpResponse.json({
            data: [
              {
                address_snapshot: {
                  city: 'Leipzig',
                  formatted: 'Alte Straße 4, 04109 Leipzig',
                  house_number: '4',
                  latitude: 51.3397,
                  longitude: 12.3731,
                  street: 'Alte Straße',
                  zip_code: '04109',
                },
                change_reason: 'Adresse und Öffnungszeiten angepasst',
                changed_at: '2026-08-03T10:00:00Z',
                changed_by_user_id: ADMIN_USER.id,
                contact_email: 'historisch@example.test',
                description: 'Historischer Behördenstand',
                id: 'history-1',
                is_active: true,
                name: 'Ordnungsamt',
                office_id: OFFICE_ID,
                opening_hours: {
                  monday: '08:00-12:00',
                  saturday: 'geschlossen',
                },
                phone: '+49 341 123456',
                services: ['Fundbüro'],
              },
            ],
            page: 1,
            pages: 1,
            size: 20,
            total: 1,
          })
        },
      ),
    )

    renderHistory()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ordnungsamt' }),
    ).toBeVisible()
    expect(
      (await screen.findAllByText('Adresse und Öffnungszeiten angepasst'))[0],
    ).toBeVisible()
    expect(
      (await screen.findAllByRole('link', { name: 'Ada Admin' }))[0],
    ).toHaveAttribute('href', `/users/${ADMIN_USER.id}`)

    await user.click(
      screen.getByRole('button', { name: 'Details anzeigen' }),
    )

    expect(screen.getAllByText(/Alte Straße 4/)[0]).toBeVisible()
    expect(screen.queryByText(/Neue Straße/)).not.toBeInTheDocument()
    expect(screen.getAllByText('Historischer Behördenstand')[0]).toBeVisible()
    expect(screen.getAllByText('08:00–12:00 Uhr')[0]).toBeVisible()
    expect(screen.getAllByText('Fundbüro')[0]).toBeVisible()
    expect(screen.queryByText('Breitengrad')).not.toBeInTheDocument()
    expect(screen.queryByText('Längengrad')).not.toBeInTheDocument()
    expect(screen.queryByText('Historien-ID')).not.toBeInTheDocument()
    expect(screen.queryByText('Behörden-ID')).not.toBeInTheDocument()
    expect(requestedRange?.get('start_date')).toBe(
      '2026-07-31T22:00:00.000Z',
    )
    expect(requestedRange?.get('end_date')).toBe(
      '2026-08-03T21:59:59.999Z',
    )
    expect(
      screen.getByRole('link', { name: 'Zurück zu den Behördendetails' }),
    ).toHaveAttribute('href', `/offices/${OFFICE_ID}`)
  })

  it('blocks an invalid date range before sending a history request', async () => {
    let historyRequests = 0

    mockApiServer.use(
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json(officeResponse()),
      ),
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}/history`, () => {
        historyRequests += 1
        return HttpResponse.json({
          data: [],
          page: 1,
          pages: 0,
          size: 20,
          total: 0,
        })
      }),
    )

    renderHistory('?startDate=2026-08-04&endDate=2026-08-03')

    expect(
      await screen.findByRole('heading', { name: 'Zeitraum überprüfen' }),
    ).toBeVisible()
    expect(historyRequests).toBe(0)
  })
})

/** Renders the office history route with an administrator auth projection. */
function renderHistory(search = '?startDate=2026-08-01&endDate=2026-08-03') {
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
              pathname: `/offices/${OFFICE_ID}/history`,
              search,
              state: { listFrom: '/offices?status=inactive' },
            },
          ]}
        >
          <Routes>
            <Route
              path="offices/:officeId/history"
              element={<OfficeHistoryPage />}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

/** Creates one current office response that intentionally differs from its history. */
function officeResponse() {
  return {
    address: {
      city: 'Leipzig',
      house_number: '12',
      id: '00000000-0000-4000-8000-000000000020',
      latitude: null,
      longitude: null,
      street: 'Neue Straße',
      zip_code: '04109',
    },
    contact_email: 'aktuell@example.test',
    description: 'Aktueller Stand',
    id: OFFICE_ID,
    metadata: {
      created_at: '2026-01-01T00:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    name: 'Ordnungsamt',
    opening_hours: null,
    phone: null,
    services: [],
  }
}
