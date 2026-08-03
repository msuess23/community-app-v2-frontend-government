import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { UserDetailPage } from '@/features/users/pages/UserDetailPage'
import { mockApiServer } from '@/test/server'

const ADMIN_USER: AuthUser = {
  email: 'admin@example.test',
  firstName: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}

const TARGET_ID = '00000000-0000-4000-8000-000000000002'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'

describe('UserDetailPage', () => {
  it('shows readable profile, lifecycle and office information', async () => {
    mockApiServer.use(
      http.get(`http://localhost/api/v1/users/${TARGET_ID}`, () =>
        HttpResponse.json({
          email: 'officer@example.test',
          first_name: 'Otto',
          id: TARGET_ID,
          last_name: 'Officer',
          metadata: {
            created_at: '2026-08-01T10:00:00Z',
            deactivated_at: null,
            is_active: true,
          },
          office_id: OFFICE_ID,
          role: 'OFFICER',
        }),
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
    )

    renderDetail()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Otto Officer' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Ordnungsamt')).toBeVisible()
    expect(screen.getByText('Sachbearbeitung')).toBeVisible()
    expect(screen.getByText(TARGET_ID)).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Administrativ bearbeiten' }),
    ).toHaveAttribute('href', `/users/${TARGET_ID}/edit`)
    expect(
      screen.getByRole('link', { name: 'Zurück zum Benutzerverzeichnis' }),
    ).toHaveAttribute('href', '/users?role=OFFICER')
  })
})

/** Renders a detail route with an explicit list-return state. */
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
              pathname: `/users/${TARGET_ID}`,
              state: { from: '/users?role=OFFICER' },
            },
          ]}
        >
          <Routes>
            <Route path="users/:userId" element={<UserDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}
