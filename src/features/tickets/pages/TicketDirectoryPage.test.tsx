import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { TicketDirectoryPage } from '@/features/tickets/pages/TicketDirectoryPage'
import { mockApiServer } from '@/test/server'

const TICKET_ID = '00000000-0000-4000-8000-000000000100'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'
const OFFICER: AuthUser = {
  email: 'officer@example.test',
  firstName: 'Olaf',
  id: 'officer-1',
  lastName: 'Ordnung',
  officeId: OFFICE_ID,
  role: 'OFFICER',
}

describe('TicketDirectoryPage', () => {
  it('renders responsive results and sends every supported human-readable filter', async () => {
    let requestedSearch = ''

    mockApiServer.use(
      http.get('http://localhost/api/v1/offices', () =>
        HttpResponse.json({
          data: [officeResponse()],
          page: 1,
          pages: 1,
          size: 20,
          total: 1,
        }),
      ),
      http.get('http://localhost/api/v1/tickets/internal', ({ request }) => {
        requestedSearch = new URL(request.url).search
        return HttpResponse.json({
          data: [ticketResponse()],
          page: 1,
          pages: 1,
          size: 20,
          total: 1,
        })
      }),
    )

    renderDirectory(
      `/tickets?search=schlagloch&lifecycle=completed&workflowState=COMPLETED&status=RESOLVED&category=INFRASTRUCTURE&office=${OFFICE_ID}&createdFrom=2026-08-01&createdTo=2026-08-02&updatedFrom=2026-08-03&updatedTo=2026-08-04&sortBy=title&sortDirection=asc`,
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tickets' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Bestand')).toHaveValue('completed')
    expect(screen.getByLabelText('Workflowzustand')).toHaveValue('COMPLETED')
    expect(screen.getByLabelText('Öffentlicher Status')).toHaveValue('RESOLVED')
    expect(screen.getByLabelText('Kategorie')).toHaveValue('INFRASTRUCTURE')
    expect(screen.getByLabelText('Behörde')).toHaveValue(OFFICE_ID)
    expect(screen.getByLabelText('Sortierung')).toHaveValue('title:asc')
    expect(screen.getByRole('searchbox', { name: 'Tickets suchen' })).toHaveAttribute(
      'maxlength',
      '200',
    )

    const table = await screen.findByRole('table', {
      name: 'Ticketverzeichnis',
    })
    expect(
      within(table).getByRole('link', { name: 'Schlagloch in der Parkstraße' }),
    ).toHaveAttribute('href', `/tickets/${TICKET_ID}`)
    expect(within(table).getByText('Tiefbauamt')).toBeVisible()
    expect(within(table).getByText('Olaf Ordnung')).toBeVisible()
    expect(within(table).getByText('Abgeschlossen')).toBeVisible()

    const compactList = screen.getByRole('list', { name: 'Ticketverzeichnis' })
    expect(
      within(compactList).getByRole('link', {
        name: 'Schlagloch in der Parkstraße',
      }),
    ).toHaveAttribute('href', `/tickets/${TICKET_ID}`)

    await waitFor(() => {
      expect(requestedSearch).toContain('q=schlagloch')
      expect(requestedSearch).toContain('lifecycle=completed')
      expect(requestedSearch).toContain('workflow_state=COMPLETED')
      expect(requestedSearch).toContain('status=RESOLVED')
      expect(requestedSearch).toContain('category=INFRASTRUCTURE')
      expect(requestedSearch).toContain(`office_id=${OFFICE_ID}`)
      expect(requestedSearch).toContain(
        'created_from=2026-07-31T22%3A00%3A00.000Z',
      )
      expect(requestedSearch).toContain(
        'created_to=2026-08-02T21%3A59%3A59.999Z',
      )
      expect(requestedSearch).toContain(
        'updated_from=2026-08-02T22%3A00%3A00.000Z',
      )
      expect(requestedSearch).toContain(
        'updated_to=2026-08-04T21%3A59%3A59.999Z',
      )
      expect(requestedSearch).toContain('sort_by=title')
      expect(requestedSearch).toContain('order=asc')
      expect(requestedSearch).toContain('size=20')
      expect(requestedSearch).not.toContain('creator_user_id=')
      expect(requestedSearch).not.toContain('primary_officer_id=')
    })
  })
})

function renderDirectory(initialEntry: string) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthContext.Provider value={authValue(OFFICER)}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <TicketDirectoryPage />
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

function ticketResponse() {
  return {
    address: {
      city: 'Leipzig',
      house_number: '18',
      id: 'address-1',
      latitude: 51.34,
      longitude: 12.37,
      street: 'Parkstraße',
      zip_code: '04109',
    },
    category: 'INFRASTRUCTURE',
    created_at: '2026-08-01T08:00:00Z',
    creator: { display_name: 'Clara Bürgerin', id: 'citizen-1' },
    creator_user_id: 'citizen-1',
    current_assignee: { display_name: 'Olaf Ordnung', id: 'officer-1' },
    current_assignee_id: 'officer-1',
    current_status: {
      created_at: '2026-08-04T08:00:00Z',
      id: 'status-1',
      message: 'Die Reparatur wurde abgeschlossen.',
      status: 'RESOLVED',
    },
    description: 'Ein tiefes Schlagloch befindet sich am rechten Fahrbahnrand.',
    id: TICKET_ID,
    image_url: null,
    office: { id: OFFICE_ID, name: 'Tiefbauamt' },
    office_id: OFFICE_ID,
    primary_officer: { display_name: 'Paula Primär', id: 'officer-2' },
    primary_officer_id: 'officer-2',
    return_to_user: null,
    return_to_user_id: null,
    title: 'Schlagloch in der Parkstraße',
    updated_at: '2026-08-04T08:00:00Z',
    version: 8,
    visibility: 'PUBLIC',
    workflow_state: 'COMPLETED',
  }
}

function officeResponse() {
  return {
    address: null,
    contact_email: 'tiefbau@example.test',
    description: null,
    id: OFFICE_ID,
    metadata: {
      created_at: '2026-01-01T08:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    name: 'Tiefbauamt',
    opening_hours: null,
    phone: null,
    services: [],
  }
}
