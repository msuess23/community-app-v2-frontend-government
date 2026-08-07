import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AppointmentDetailPage } from '@/features/appointments/pages/AppointmentDetailPage'
import { ConfirmationProvider } from '@/shared/confirmation/ConfirmationProvider'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { mockApiServer } from '@/test/server'

const APPOINTMENT_ID = '00000000-0000-4000-8000-000000000100'
const TICKET_ID = '00000000-0000-4000-8000-000000000030'

beforeEach(() => {
  mockApiServer.use(
    http.get(
      `http://localhost/api/v1/appointments/${APPOINTMENT_ID}/documents`,
      () => HttpResponse.json([]),
    ),
  )
})

describe('AppointmentDetailPage', () => {
  it('renders the current projection and preserves a list return target', async () => {
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}`,
        () => HttpResponse.json(appointmentResponse(false)),
      ),
      http.get(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}/events`,
        () => HttpResponse.json(appointmentEventsResponse()),
      ),
    )

    renderDetail()

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Termin mit Clara Bürgerin',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Ummeldung des Wohnsitzes')).toBeVisible()
    expect(screen.getAllByText('Geplant').length).toBeGreaterThan(0)
    expect(screen.getByText('Bürgeramt Mitte')).toBeVisible()
    expect(screen.getByText('Anliegen zur Ummeldung')).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'Anliegen zur Ummeldung' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/außerhalb deiner aktuellen Ticketzuständigkeit/),
    ).toBeVisible()
    expect(screen.getByLabelText('Aktueller Terminstand')).toHaveTextContent(
      'Terminstand Version 1',
    )
    expect(
      screen.getByRole('link', { name: 'Zurück zum Terminverzeichnis' }),
    ).toHaveAttribute(
      'href',
      '/appointments?status=SCHEDULED&sortBy=startsAt&sortDirection=asc',
    )
  })

  it('links the ticket only when the backend confirms access', async () => {
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}`,
        () => HttpResponse.json(appointmentResponse(true)),
      ),
      http.get(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}/events`,
        () => HttpResponse.json(appointmentEventsResponse()),
      ),
    )

    renderDetail()

    expect(
      await screen.findByRole('link', { name: 'Anliegen zur Ummeldung' }),
    ).toHaveAttribute('href', `/tickets/${TICKET_ID}`)
  })

  it('reschedules through a server-provided action and commits the returned projection', async () => {
    let requestBody: unknown
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}`,
        () => HttpResponse.json(appointmentResponse(true)),
      ),
      http.get(
        'http://localhost/api/v1/offices/office-1/appointment-slots',
        () =>
          HttpResponse.json({
            data: [
              {
                created_at: '2026-08-01T08:00:00Z',
                ends_at: '2026-08-13T10:30:00Z',
                id: 'slot-2',
                office_id: 'office-1',
                starts_at: '2026-08-13T10:00:00Z',
                status: 'AVAILABLE',
              },
            ],
            page: 1,
            pages: 1,
            size: 100,
            total: 1,
          }),
      ),
      http.post(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}/reschedule`,
        async ({ request }) => {
          requestBody = await request.json()
          return HttpResponse.json({
            ...appointmentResponse(true),
            current_slot_id: 'slot-2',
            ends_at: '2026-08-13T10:30:00Z',
            starts_at: '2026-08-13T10:00:00Z',
            updated_at: '2026-08-06T10:00:00Z',
            version: 2,
          })
        },
      ),
      http.get(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}/events`,
        () => HttpResponse.json(appointmentEventsResponse()),
      ),
    )

    const user = userEvent.setup()
    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Verschieben' }))
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Neuer Terminslot' }),
      'slot-2',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Begründung' }),
      'Wunsch des Bürgers',
    )
    await user.click(screen.getByRole('button', { name: 'Termin verschieben' }))

    expect(await screen.findByText('Termin verschoben')).toBeVisible()
    expect(requestBody).toEqual({
      reason: 'Wunsch des Bürgers',
      target_slot_id: 'slot-2',
    })
    expect(screen.getByLabelText('Aktueller Terminstand')).toHaveTextContent(
      'Terminstand Version 2',
    )
    expect(
      screen.queryByRole('dialog', { name: 'Termin verschieben' }),
    ).not.toBeInTheDocument()
  })
})

function renderDetail() {
  const router = createMemoryRouter(
    [
      {
        element: <AppointmentDetailPage />,
        path: '/appointments/:appointmentId',
      },
    ],
    {
      initialEntries: [
        {
          pathname: `/appointments/${APPOINTMENT_ID}`,
          state: {
            from:
              '/appointments?status=SCHEDULED&sortBy=startsAt&sortDirection=asc',
          },
        },
      ],
    },
  )

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <FeedbackProvider>
        <ConfirmationProvider>
          <RouterProvider router={router} />
        </ConfirmationProvider>
      </FeedbackProvider>
    </QueryClientProvider>,
  )
}

function appointmentResponse(canView: boolean) {
  return {
    allowed_actions: ['RESCHEDULE', 'CANCEL'],
    cancelled_at: null,
    citizen: { display_name: 'Clara Bürgerin', id: 'citizen-1' },
    citizen_id: 'citizen-1',
    completed_at: null,
    created_at: '2026-08-01T08:00:00Z',
    current_slot_id: 'slot-1',
    ends_at: '2026-08-12T09:30:00Z',
    id: APPOINTMENT_ID,
    office: { id: 'office-1', name: 'Bürgeramt Mitte' },
    office_id: 'office-1',
    reason: 'Ummeldung des Wohnsitzes',
    starts_at: '2026-08-12T09:00:00Z',
    status: 'SCHEDULED',
    ticket: {
      can_view: canView,
      id: TICKET_ID,
      title: 'Anliegen zur Ummeldung',
    },
    ticket_id: TICKET_ID,
    updated_at: '2026-08-02T08:00:00Z',
    version: 1,
  }
}

function appointmentEventsResponse() {
  return {
    data: [
      {
        actor: { display_name: 'Clara Bürgerin', id: 'citizen-1' },
        actor_user_id: 'citizen-1',
        event_type: 'APPOINTMENT_BOOKED',
        id: 'event-1',
        occurred_at: '2026-08-01T08:00:00Z',
        payload: {
          citizen_id: 'citizen-1',
          ends_at: '2026-08-12T09:30:00Z',
          office_id: 'office-1',
          reason: 'Ummeldung des Wohnsitzes',
          slot_id: 'slot-1',
          starts_at: '2026-08-12T09:00:00Z',
          ticket_id: TICKET_ID,
        },
        sequence_number: 1,
      },
    ],
    page: 1,
    pages: 1,
    size: 20,
    total: 1,
  }
}
