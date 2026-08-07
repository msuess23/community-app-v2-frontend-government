import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { OfficeDirectoryPage } from '@/features/offices/pages/OfficeDirectoryPage'
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

describe('OfficeDirectoryPage', () => {
  it('renders administrator filters and equivalent desktop and compact views', async () => {
    let requestedSearch = ''

    mockApiServer.use(
      http.get('http://localhost/api/v1/offices', ({ request }) => {
        requestedSearch = new URL(request.url).search
        return HttpResponse.json({
          data: [createOfficeResponse()],
          page: 1,
          pages: 1,
          size: 100,
          total: 1,
        })
      }),
    )

    renderDirectory(
      '/offices?search=ordnung&status=all&sortBy=createdAt&sortDirection=desc',
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Behörden' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Behördenstatus')).toHaveValue('all')
    expect(screen.getByLabelText('Sortierung')).toHaveValue('createdAt:desc')
    expect(
      screen.getByRole('combobox', { name: 'Einträge pro Seite' }),
    ).toHaveValue('20')
    expect(
      screen.getByRole('link', { name: 'Behörde anlegen' }),
    ).toHaveAttribute('href', '/offices/new')

    const table = await screen.findByRole('table', {
      name: 'Behördenverzeichnis',
    })
    expect(within(table).getByText('Ordnungsamt')).toBeInTheDocument()
    expect(within(table).getByText('Leipzig')).toBeInTheDocument()
    expect(within(table).getByText('Aktiv')).toBeInTheDocument()

    const compactList = screen.getByRole('list', {
      name: 'Behördenverzeichnis',
    })
    expect(
      within(compactList).getByRole('article', {
        name: 'Ordnungsamt, Leipzig',
      }),
    ).toHaveTextContent('ordnung@example.test')

    await waitFor(() => {
      expect(requestedSearch).toContain('q=ordnung')
      expect(requestedSearch).toContain('status=all')
      expect(requestedSearch).toContain('sort_by=created_at')
      expect(requestedSearch).toContain('order=desc')
      expect(requestedSearch).toContain('size=20')
      expect(requestedSearch).not.toContain('bbox=')
    })
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
          <OfficeDirectoryPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

/** Creates one complete API response for directory rendering. */
function createOfficeResponse() {
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
    contact_email: 'ordnung@example.test',
    description: 'Zentrale Anlaufstelle',
    id: OFFICE_ID,
    metadata: {
      created_at: '2026-08-01T10:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    name: 'Ordnungsamt',
    opening_hours: { monday: '08:00-12:00' },
    phone: '+49 341 123456',
    services: ['Fundbüro', 'Gewerbeangelegenheiten', 'Sondernutzung'],
  }
}
