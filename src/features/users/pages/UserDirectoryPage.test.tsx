import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { UserDirectoryPage } from '@/features/users/pages/UserDirectoryPage'
import { mockApiServer } from '@/test/server'

const ADMIN_USER: AuthUser = {
  email: 'admin@example.com',
  firstName: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}

describe('UserDirectoryPage', () => {
  it('renders role-scoped filters and equivalent desktop and compact data views', async () => {
    let requestedUserSearch = ''

    mockApiServer.use(
      http.get('http://localhost/api/v1/users', ({ request }) => {
        requestedUserSearch = new URL(request.url).search
        return HttpResponse.json({
          data: [
            {
              email: 'citizen@example.com',
              first_name: 'Clara',
              id: '00000000-0000-4000-8000-000000000002',
              last_name: 'Citizen',
              metadata: {
                created_at: '2026-08-01T10:00:00Z',
                deactivated_at: null,
                is_active: true,
              },
              office_id: null,
              role: 'CITIZEN',
            },
          ],
          page: 1,
          pages: 1,
          size: 100,
          total: 1,
        })
      }),
      http.get('http://localhost/api/v1/offices', () =>
        HttpResponse.json({
          data: [
            {
              id: '00000000-0000-4000-8000-000000000010',
              metadata: {
                created_at: '2026-01-01T00:00:00Z',
                deactivated_at: null,
                is_active: true,
              },
              name: 'Ordnungsamt',
            },
          ],
          page: 1,
          pages: 1,
          size: 100,
          total: 1,
        }),
      ),
    )

    renderDirectory(
      '/users?role=CITIZEN&status=all&sortBy=email&sortDirection=desc',
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Benutzer' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Rolle')).toHaveValue('CITIZEN')
    expect(screen.getByLabelText('Kontostatus')).toHaveValue('all')
    expect(screen.getByLabelText('Sortierung')).toHaveValue('email:desc')
    expect(
      await screen.findByRole('combobox', { name: 'Einträge pro Seite' }),
    ).toHaveValue('20')
    await waitFor(() => expect(screen.getByLabelText('Behörde')).toBeEnabled())

    const table = await screen.findByRole('table', {
      name: 'Benutzerverzeichnis',
    })
    expect(within(table).getByText('Clara Citizen')).toBeInTheDocument()
    expect(within(table).getByText('Bürgerkonto')).toBeInTheDocument()

    const compactList = screen.getByRole('list', {
      name: 'Benutzerverzeichnis',
    })
    expect(
      within(compactList).getByRole('article', { name: 'Clara Citizen' }),
    ).toHaveTextContent('citizen@example.com')

    expect(requestedUserSearch).toContain('role=CITIZEN')
    expect(requestedUserSearch).toContain('status=all')
    expect(requestedUserSearch).toContain('sort_by=email')
    expect(requestedUserSearch).toContain('order=desc')
    expect(requestedUserSearch).toContain('size=20')
  })
})

/** Renders the feature page with the smallest authenticated application context. */
function renderDirectory(initialEntry: string) {
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
        <MemoryRouter initialEntries={[initialEntry]}>
          <UserDirectoryPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}
