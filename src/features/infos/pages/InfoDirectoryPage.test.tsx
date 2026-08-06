import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { InfoDirectoryPage } from '@/features/infos/pages/InfoDirectoryPage'
import { mockApiServer } from '@/test/server'

const ADMIN_USER: AuthUser = {
  email: 'admin@example.test',
  firstName: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}
const INFO_ID = '00000000-0000-4000-8000-000000000100'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'

describe('InfoDirectoryPage', () => {
  it('renders content cards and sends every selected backend filter except Geo', async () => {
    let requestedSearch = ''

    mockApiServer.use(
      http.get('http://localhost/api/v1/offices', () =>
        HttpResponse.json({
          data: [officeResponse()],
          page: 1,
          pages: 1,
          size: 100,
          total: 1,
        }),
      ),
      http.get('http://localhost/api/v1/infos', ({ request }) => {
        requestedSearch = new URL(request.url).search
        return HttpResponse.json({
          data: [infoResponse()],
          page: 1,
          pages: 1,
          size: 100,
          total: 1,
        })
      }),
    )

    renderDirectory(
      `/infos?search=stadtfest&office=${OFFICE_ID}&category=EVENT&status=ACTIVE&startsFrom=2026-08-10&endsTo=2026-08-12&sortBy=updatedAt&sortDirection=desc`,
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mitteilungen' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Behörde')).toHaveValue(OFFICE_ID)
    expect(screen.getByLabelText('Kategorie')).toHaveValue('EVENT')
    expect(screen.getByLabelText('Status')).toHaveValue('ACTIVE')
    expect(screen.getByLabelText('Sortierung')).toHaveValue('updatedAt:desc')
    expect(
      await screen.findByRole('combobox', { name: 'Einträge pro Seite' }),
    ).toHaveValue('20')

    const card = await screen.findByRole('listitem')
    expect(within(card).getByRole('link', { name: 'Stadtteilfest' })).toHaveAttribute(
      'href',
      `/infos/${INFO_ID}`,
    )
    expect(within(card).getByText('Veranstaltung')).toBeVisible()
    expect(within(card).getByText('Ordnungsamt · Leipzig')).toBeVisible()
    expect(card.querySelector('img')).toHaveAttribute('alt', '')

    await waitFor(() => {
      expect(requestedSearch).toContain('q=stadtfest')
      expect(requestedSearch).toContain(`office_id=${OFFICE_ID}`)
      expect(requestedSearch).toContain('category=EVENT')
      expect(requestedSearch).toContain('status=ACTIVE')
      expect(requestedSearch).toContain('starts_from=2026-08-09T22%3A00%3A00.000Z')
      expect(requestedSearch).toContain('ends_to=2026-08-12T21%3A59%3A59.999Z')
      expect(requestedSearch).toContain('sort_by=updated_at')
      expect(requestedSearch).toContain('order=desc')
      expect(requestedSearch).toContain('size=20')
      expect(requestedSearch).not.toContain('bbox=')
    })
  })
})

function renderDirectory(initialEntry: string) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthContext.Provider value={authValue(ADMIN_USER)}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <InfoDirectoryPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

function authValue(user: AuthUser): AuthContextValue {
  return {
    isAuthenticated: true,
    isInitializing: false,
    login: vi.fn(async () => user),
    logout: vi.fn(async () => undefined),
    logoutAll: vi.fn(async () => undefined),
    refreshCurrentUser: vi.fn(async () => user),
    register: vi.fn(async () => user),
    state: { status: 'authenticated', user },
    updateCurrentUser: vi.fn(async () => user),
    user,
  }
}

function infoResponse() {
  return {
    address: {
      city: 'Leipzig',
      house_number: '1',
      id: '00000000-0000-4000-8000-000000000110',
      latitude: 51.34,
      longitude: 12.37,
      street: 'Markt',
      zip_code: '04109',
    },
    category: 'EVENT',
    created_at: '2026-08-01T08:00:00Z',
    current_status: {
      created_at: '2026-08-02T08:00:00Z',
      id: '00000000-0000-4000-8000-000000000120',
      message: 'Findet statt.',
      status: 'ACTIVE',
    },
    description: 'Sommerfest mit Bühnenprogramm und Informationsständen.',
    ends_at: '2026-08-12T20:00:00Z',
    id: INFO_ID,
    image_url: `/api/v1/infos/${INFO_ID}/images/image-1/content`,
    office_id: OFFICE_ID,
    starts_at: '2026-08-12T15:00:00Z',
    title: 'Stadtteilfest',
    updated_at: '2026-08-02T08:00:00Z',
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
