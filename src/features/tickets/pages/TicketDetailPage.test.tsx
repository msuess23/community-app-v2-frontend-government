import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { TicketDetailPage } from '@/features/tickets/pages/TicketDetailPage'
import { ConfirmationProvider } from '@/shared/confirmation/ConfirmationProvider'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { mockApiServer } from '@/test/server'

const TICKET_ID = '00000000-0000-4000-8000-000000000100'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'
const MANAGER: AuthUser = {
  email: 'manager@example.com',
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
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/events`,
        () => HttpResponse.json(ticketEventsResponse()),
      ),
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/comments`,
        () => HttpResponse.json(ticketCommentsResponse()),
      ),
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/images`,
        () => HttpResponse.json(ticketImagesResponse()),
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
    expect(screen.getAllByText('Öffentlich').length).toBeGreaterThan(0)
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
    expect(await screen.findByText('Ticket eingereicht')).toBeVisible()
    expect(screen.getByText('Interne fachliche Prüfung läuft.')).toBeVisible()
    expect(screen.getByText('schlagloch.jpg')).toBeVisible()
    expect(screen.getByText('Historisch entfernte Bilder')).toBeVisible()
    expect(
      screen.getByRole('status', { name: 'Aktueller Ticketstand' }),
    ).toHaveTextContent('Ticketstand Version 4')
    const metadata = screen.getByRole('region', { name: 'Metadaten' })
    expect(within(metadata).getByText('4')).toBeVisible()
    expect(screen.queryByText(TICKET_ID)).not.toBeInTheDocument()
    expect(screen.queryByText('officer-1')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Weiterleiten' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Abschließen' })).toBeVisible()

    expect(
      screen.getByRole('link', { name: 'Zurück zum Ticketverzeichnis' }),
    ).toHaveAttribute(
      'href',
      `/tickets?workflowState=IN_PROGRESS&sortBy=updatedAt&sortDirection=desc`,
    )
  })

  it('executes a server-filtered forwarding action and commits the returned projection', async () => {
    let workflowRequest: unknown
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/internal`,
        () => HttpResponse.json(ticketResponse()),
      ),
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/workflow-options`,
        () =>
          HttpResponse.json({
            completion_outcomes: ['RESOLVED', 'REJECTED'],
            cosignature_targets: [],
            escalation_targets: [],
            forward_targets: [
              {
                display_name: 'Erika Einsatz',
                id: 'officer-3',
                office: { id: 'office-2', name: 'Ordnungsamt' },
                role: 'OFFICER',
              },
            ],
            offices: [],
            primary_officers: [],
            ticket_id: TICKET_ID,
            version: 4,
          }),
      ),
      http.post(
        `http://localhost/api/v1/tickets/${TICKET_ID}/workflow`,
        async ({ request }) => {
          workflowRequest = await request.json()
          return HttpResponse.json({
            ...ticketResponse(),
            allowed_actions: [],
            current_assignee: {
              display_name: 'Erika Einsatz',
              id: 'officer-3',
            },
            current_assignee_id: 'officer-3',
            updated_at: '2026-08-02T10:00:00Z',
            version: 5,
          })
        },
      ),
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/events`,
        () => HttpResponse.json(ticketEventsResponse()),
      ),
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/comments`,
        () => HttpResponse.json(ticketCommentsResponse()),
      ),
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/images`,
        () => HttpResponse.json(ticketImagesResponse()),
      ),
    )

    const user = userEvent.setup()
    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Weiterleiten' }))
    expect(
      screen.getByRole('heading', { name: 'Ticket weiterleiten' }),
    ).toBeVisible()

    await user.selectOptions(
      await screen.findByRole('combobox', { name: /Weiterleiten an/ }),
      'officer-3',
    )
    await user.type(
      screen.getByLabelText('Optionaler Kommentar'),
      'Bitte die Sperrung koordinieren.',
    )
    await user.click(
      screen.getByRole('button', { name: 'Ticket weiterleiten' }),
    )

    expect(await screen.findByText('Ticket weitergeleitet')).toBeVisible()
    expect(workflowRequest).toEqual({
      action: 'FORWARD',
      comment: 'Bitte die Sperrung koordinieren.',
      target_user_id: 'officer-3',
    })
    expect(
      within(
        screen.getByRole('region', { name: 'Aktuelle Zuständigkeit' }),
      ).getByText('Erika Einsatz'),
    ).toBeVisible()
    expect(
      screen.queryByRole('dialog', { name: 'Ticket weiterleiten' }),
    ).not.toBeInTheDocument()
  })
})

function renderDetail() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <FeedbackProvider>
        <ConfirmationProvider>
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
        </ConfirmationProvider>
      </FeedbackProvider>
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

function ticketEventsResponse() {
  return {
    data: [
      {
        actor: { display_name: 'Clara Bürgerin', id: 'citizen-1' },
        actor_user_id: 'citizen-1',
        event_type: 'TICKET_SUBMITTED',
        id: 'event-1',
        occurred_at: '2026-08-01T08:00:00Z',
        payload: {
          category: 'INFRASTRUCTURE',
          creator_user_id: 'citizen-1',
          description:
            'Ein tiefes Schlagloch befindet sich am rechten Fahrbahnrand.',
          title: 'Schlagloch in der Parkstraße',
          visibility: 'PUBLIC',
        },
        references: { offices: [], users: [] },
        sequence_number: 1,
        ticket_id: TICKET_ID,
      },
    ],
    page: 1,
    pages: 1,
    size: 20,
    total: 1,
  }
}

function ticketCommentsResponse() {
  return [
    {
      author: {
        author_type: 'AUTHORITY',
        display_name: 'Olaf Ordnung',
        id: 'officer-1',
      },
      created_at: '2026-08-02T10:00:00Z',
      id: 'comment-1',
      is_internal: true,
      text: 'Interne fachliche Prüfung läuft.',
      ticket_id: TICKET_ID,
    },
  ]
}

function ticketImagesResponse() {
  return [
    {
      height: 720,
      id: 'image-1',
      is_active: true,
      is_cover: true,
      mime_type: 'image/jpeg',
      original_filename: 'schlagloch.jpg',
      removed_at: null,
      size_bytes: 1200,
      ticket_id: TICKET_ID,
      uploaded_at: '2026-08-02T08:00:00Z',
      url: `/api/v1/tickets/${TICKET_ID}/images/image-1/content`,
      width: 1280,
    },
  ]
}
