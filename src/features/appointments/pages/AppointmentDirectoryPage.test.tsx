import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AppointmentDirectoryPage } from '@/features/appointments/pages/AppointmentDirectoryPage'
import { mockApiServer } from '@/test/server'

const APPOINTMENT_ID = '00000000-0000-4000-8000-000000000100'
const CITIZEN_ID = '00000000-0000-4000-8000-000000000020'
const TICKET_ID = '00000000-0000-4000-8000-000000000030'

describe('AppointmentDirectoryPage', () => {
  it('renders equivalent responsive views and sends every supported readable filter', async () => {
    let requestedSearch = ''
    mockApiServer.use(
      http.get(
        'http://localhost/api/v1/appointments/internal/filter-options',
        () =>
          HttpResponse.json({
            citizens: [{ display_name: 'Clara Bürgerin', id: CITIZEN_ID }],
            tickets: [
              {
                can_view: true,
                id: TICKET_ID,
                title: 'Anliegen zur Ummeldung',
              },
            ],
          }),
      ),
      http.get(
        'http://localhost/api/v1/appointments/internal',
        ({ request }) => {
          requestedSearch = new URL(request.url).search
          return HttpResponse.json({
            data: [appointmentResponse()],
            page: 1,
            pages: 1,
            size: 20,
            total: 1,
          })
        },
      ),
    )

    renderDirectory(
      `/appointments?search=clara&status=SCHEDULED&citizen=${CITIZEN_ID}&ticket=${TICKET_ID}&startsFrom=2026-08-10&startsTo=2026-08-12&createdFrom=2026-08-01&createdTo=2026-08-02&sortBy=status&sortDirection=desc`,
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Termine' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toHaveValue('SCHEDULED')
    expect(screen.getByLabelText('Bürger')).toHaveValue(CITIZEN_ID)
    expect(screen.getByLabelText('Ticket')).toHaveValue(TICKET_ID)
    expect(screen.getByLabelText('Sortierung')).toHaveValue('status:desc')
    expect(
      screen.getByRole('searchbox', { name: 'Termine suchen' }),
    ).toHaveAttribute('maxlength', '200')

    const table = await screen.findByRole('table', {
      name: 'Terminverzeichnis',
    })
    expect(
      within(table).getByRole('link', { name: /12\.08\.2026/ }),
    ).toHaveAttribute('href', `/appointments/${APPOINTMENT_ID}`)
    expect(within(table).getByText('Clara Bürgerin')).toBeVisible()
    expect(within(table).getByText('Geplant')).toBeVisible()

    const compactList = screen.getByRole('list', {
      name: 'Terminverzeichnis',
    })
    expect(
      within(compactList).getByRole('link', { name: /12\.08\.2026/ }),
    ).toHaveAttribute('href', `/appointments/${APPOINTMENT_ID}`)

    await waitFor(() => {
      expect(requestedSearch).toContain('q=clara')
      expect(requestedSearch).toContain('status=SCHEDULED')
      expect(requestedSearch).toContain(`citizen_id=${CITIZEN_ID}`)
      expect(requestedSearch).toContain(`ticket_id=${TICKET_ID}`)
      expect(requestedSearch).toContain(
        'starts_from=2026-08-09T22%3A00%3A00.000Z',
      )
      expect(requestedSearch).toContain(
        'starts_to=2026-08-12T21%3A59%3A59.999Z',
      )
      expect(requestedSearch).toContain('sort_by=status')
      expect(requestedSearch).toContain('order=desc')
    })
  })
})

function renderDirectory(initialEntry: string) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppointmentDirectoryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function appointmentResponse() {
  return {
    allowed_actions: ['RESCHEDULE', 'CANCEL'],
    cancelled_at: null,
    citizen: { display_name: 'Clara Bürgerin', id: CITIZEN_ID },
    citizen_id: CITIZEN_ID,
    completed_at: null,
    created_at: '2026-08-01T08:00:00Z',
    current_slot_id: '00000000-0000-4000-8000-000000000040',
    ends_at: '2026-08-12T09:30:00Z',
    id: APPOINTMENT_ID,
    office: {
      id: '00000000-0000-4000-8000-000000000010',
      name: 'Bürgeramt Mitte',
    },
    office_id: '00000000-0000-4000-8000-000000000010',
    reason: 'Ummeldung des Wohnsitzes',
    starts_at: '2026-08-12T09:00:00Z',
    status: 'SCHEDULED',
    ticket: {
      can_view: true,
      id: TICKET_ID,
      title: 'Anliegen zur Ummeldung',
    },
    ticket_id: TICKET_ID,
    updated_at: '2026-08-02T08:00:00Z',
    version: 1,
  }
}
