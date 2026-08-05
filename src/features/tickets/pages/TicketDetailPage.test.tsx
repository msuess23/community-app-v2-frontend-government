import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { TicketDetailPage } from '@/features/tickets/pages/TicketDetailPage'
import { mockApiServer } from '@/test/server'

const TICKET_ID = '00000000-0000-4000-8000-000000000100'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'
const MANAGER: AuthUser = {
  email: 'manager@example.test',
  firstName: 'Mara',
  id: 'manager-1',
  lastName: 'Management',
  officeId: OFFICE_ID,
  role: 'MANAGER',
}

describe('TicketDetailPage', () => {
  it('renders the current projection, responsibility and preserved list return URL', async () => {
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/internal`,
        () => HttpResponse.json(ticketResponse()),
      ),
    )

    renderDetail()

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Schlagloch in der Parkstraße',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('In Bearbeitung').length).toBeGreaterThan(0)
    expect(screen.getByText('Öffentlich')).toBeVisible()
    expect(
      screen.getByText(
        'Ein tiefes Schlagloch befindet sich am rechten Fahrbahnrand.',
      ),
    ).toBeVisible()
    expect(screen.getByText('Parkstraße 18')).toBeVisible()
    expect(screen.getByText('04109 Leipzig')).toBeVisible()

    const responsibility = screen.getByRole('region', {
      name: 'Aktuelle Zuständigkeit',
    })
    expect(
      within(responsibility).getByRole('link', { name: 'Tiefbauamt' }),
    ).toHaveAttribute('href', `/offices/${OFFICE_ID}`)
    expect(within(responsibility).getByText('Clara Bürgerin')).toBeVisible()
    expect(within(responsibility).getByText('Paula Primär')).toBeVisible()
    expect(within(responsibility).getByText('Olaf Ordnung')).toBeVisible()
    expect(within(responsibility).getByText('Nicht zugewiesen')).toBeVisible()

    expect(screen.getByText('Die Bearbeitung wurde aufgenommen.')).toBeVisible()
    const metadata = screen.getByRole('region', { name: 'Metadaten' })
    expect(within(metadata).getByText('4')).toBeVisible()
    expect(screen.queryByText(TICKET_ID)).not.toBeInTheDocument()
    expect(screen.queryByText('officer-1')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /weiterleiten/i }),
    ).not.toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: 'Zurück zum Ticketverzeichnis' }),
    ).toHaveAttribute(
      'href',
      `/tickets?workflowState=IN_PROGRESS&sortBy=updatedAt&sortDirection=desc`,
    )
  })
})

function renderDetail() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthContext.Provider value={authValue(MANAGER)}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: `/tickets/${TICKET_ID}`,
              state: {
                from: '/tickets?workflowState=IN_PROGRESS&sortBy=updatedAt&sortDirection=desc',
              },
            },
          ]}
        >
          <Routes>
            <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
          </Routes>
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
    allowed_actions: ['FORWARD', 'COMPLETE'],
    category: 'INFRASTRUCTURE',
    created_at: '2026-08-01T08:00:00Z',
    creator: { display_name: 'Clara Bürgerin', id: 'citizen-1' },
    creator_user_id: 'citizen-1',
    current_assignee: { display_name: 'Olaf Ordnung', id: 'officer-1' },
    current_assignee_id: 'officer-1',
    current_status: {
      created_at: '2026-08-02T08:00:00Z',
      id: 'status-1',
      message: 'Die Bearbeitung wurde aufgenommen.',
      status: 'IN_PROGRESS',
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
    updated_at: '2026-08-02T09:30:00Z',
    version: 4,
    visibility: 'PUBLIC',
    workflow_state: 'IN_PROGRESS',
  }
}
