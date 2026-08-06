import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AppointmentDetailPage } from '@/features/appointments/pages/AppointmentDetailPage'
import { mockApiServer } from '@/test/server'

const APPOINTMENT_ID = '00000000-0000-4000-8000-000000000100'
const TICKET_ID = '00000000-0000-4000-8000-000000000030'

describe('AppointmentDetailPage', () => {
  it('renders the current projection and preserves a list return target', async () => {
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}`,
        () => HttpResponse.json(appointmentResponse(false)),
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
    )

    renderDetail()

    expect(
      await screen.findByRole('link', { name: 'Anliegen zur Ummeldung' }),
    ).toHaveAttribute('href', `/tickets/${TICKET_ID}`)
  })
})

function renderDetail() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: `/appointments/${APPOINTMENT_ID}`,
            state: {
              from:
                '/appointments?status=SCHEDULED&sortBy=startsAt&sortDirection=asc',
            },
          },
        ]}
      >
        <Routes>
          <Route
            element={<AppointmentDetailPage />}
            path="/appointments/:appointmentId"
          />
        </Routes>
      </MemoryRouter>
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
