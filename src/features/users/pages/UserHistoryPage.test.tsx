import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { UserHistoryPage } from '@/features/users/pages/UserHistoryPage'
import { mockApiServer } from '@/test/server'

const ADMIN_USER: AuthUser = {
  email: 'admin@example.com',
  firstName: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}
const TARGET_ID = '00000000-0000-4000-8000-000000000002'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'

describe('UserHistoryPage', () => {
  it('renders paginated snapshots and sends timezone-aware date filters', async () => {
    let requestedRange: URLSearchParams | undefined

    mockApiServer.use(
      http.get(`http://localhost/api/v1/users/${TARGET_ID}`, () =>
        HttpResponse.json(userResponse(TARGET_ID, 'Otto', 'Officer')),
      ),
      http.get(`http://localhost/api/v1/users/${ADMIN_USER.id}`, () =>
        HttpResponse.json(
          userResponse(ADMIN_USER.id, ADMIN_USER.firstName, ADMIN_USER.lastName, {
            email: ADMIN_USER.email,
            role: 'ADMIN',
          }),
        ),
      ),
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json({
          id: OFFICE_ID,
          metadata: {
            created_at: '2026-01-01T00:00:00Z',
            deactivated_at: null,
            is_active: true,
          },
          name: 'Ordnungsamt',
        }),
      ),
      http.get(
        `http://localhost/api/v1/users/${TARGET_ID}/history`,
        ({ request }) => {
          requestedRange = new URL(request.url).searchParams
          return HttpResponse.json({
            data: [
              {
                change_reason: 'Rolle angepasst',
                changed_at: '2026-08-03T10:00:00Z',
                changed_by_user_id: ADMIN_USER.id,
                email: 'officer@example.com',
                first_name: 'Otto',
                id: 'history-1',
                is_active: true,
                last_name: 'Officer',
                office_id: OFFICE_ID,
                role: 'OFFICER',
                user_id: TARGET_ID,
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
      await screen.findByRole('heading', { level: 1, name: 'Otto Officer' }),
    ).toBeVisible()
    expect((await screen.findAllByText('Rolle angepasst'))[0]).toBeVisible()
    expect((await screen.findAllByText('Ordnungsamt'))[0]).toBeVisible()
    expect((await screen.findAllByRole('link', { name: 'Ada Admin' }))[0]).toHaveAttribute(
      'href',
      `/users/${ADMIN_USER.id}`,
    )
    expect(requestedRange?.get('start_date')).toBe(
      '2026-07-31T22:00:00.000Z',
    )
    expect(requestedRange?.get('end_date')).toBe(
      '2026-08-03T21:59:59.999Z',
    )
    expect(
      screen.getByRole('link', { name: 'Zurück zum Benutzerprofil' }),
    ).toHaveAttribute('href', `/users/${TARGET_ID}`)
  })

  it('blocks an invalid date range before sending a history request', async () => {
    let historyRequests = 0

    mockApiServer.use(
      http.get(`http://localhost/api/v1/users/${TARGET_ID}`, () =>
        HttpResponse.json(userResponse(TARGET_ID, 'Otto', 'Officer')),
      ),
      http.get(`http://localhost/api/v1/users/${TARGET_ID}/history`, () => {
        historyRequests += 1
        return HttpResponse.json({ data: [], page: 1, pages: 0, size: 20, total: 0 })
      }),
    )

    renderHistory('?startDate=2026-08-04&endDate=2026-08-03')

    expect(
      await screen.findByRole('heading', { name: 'Zeitraum überprüfen' }),
    ).toBeVisible()
    expect(historyRequests).toBe(0)
  })
})

/** Renders the history route with an administrator auth projection. */
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
              pathname: `/users/${TARGET_ID}/history`,
              search,
              state: { listFrom: '/users?status=inactive' },
            },
          ]}
        >
          <Routes>
            <Route path="users/:userId/history" element={<UserHistoryPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

/** Creates one backend-compatible user response for history references. */
function userResponse(
  id: string,
  firstName: string,
  lastName: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    email: `${firstName.toLowerCase()}@example.com`,
    first_name: firstName,
    id,
    last_name: lastName,
    metadata: {
      created_at: '2026-01-01T00:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    office_id: OFFICE_ID,
    role: 'OFFICER',
    ...overrides,
  }
}
