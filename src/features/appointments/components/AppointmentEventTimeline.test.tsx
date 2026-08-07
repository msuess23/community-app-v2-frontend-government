import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AppointmentEventTimeline } from '@/features/appointments/components/AppointmentEventTimeline'
import { mockApiServer } from '@/test/server'

const APPOINTMENT_ID = '00000000-0000-4000-8000-000000000100'

describe('AppointmentEventTimeline', () => {
  it('loads older pages while keeping the newest sequence first', async () => {
    const requestedPages: string[] = []
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}/events`,
        ({ request }) => {
          const page = new URL(request.url).searchParams.get('page') ?? '1'
          requestedPages.push(page)
          return HttpResponse.json({
            data: [
              page === '1'
                ? eventResponse(2, 'APPOINTMENT_CANCELLED', {
                    reason: 'Bürgerwunsch',
                    slot_id: 'slot-1',
                  })
                : eventResponse(1, 'APPOINTMENT_BOOKED', {
                    citizen_id: 'citizen-1',
                    ends_at: '2026-08-12T09:30:00Z',
                    office_id: 'office-1',
                    reason: 'Ummeldung',
                    slot_id: 'slot-1',
                    starts_at: '2026-08-12T09:00:00Z',
                    ticket_id: null,
                  }),
            ],
            page: Number(page),
            pages: 2,
            size: 20,
            total: 2,
          })
        },
      ),
    )

    const user = userEvent.setup()
    render(
      <QueryClientProvider client={createQueryClient()}>
        <AppointmentEventTimeline appointmentId={APPOINTMENT_ID} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Termin storniert')).toBeVisible()
    expect(screen.queryByText('Termin gebucht')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Ältere Ereignisse laden' }),
    )

    expect(await screen.findByText('Termin gebucht')).toBeVisible()
    const events = screen.getAllByRole('listitem')
    expect(events[0]).toHaveTextContent('Termin storniert')
    expect(events[1]).toHaveTextContent('Termin gebucht')
    expect(requestedPages).toEqual(['1', '2'])
    expect(screen.getByText('2 von 2 Ereignissen angezeigt')).toBeVisible()
  })
})

function eventResponse(
  sequenceNumber: number,
  eventType: string,
  payload: Record<string, unknown>,
) {
  return {
    actor: { display_name: 'Olaf Ordnung', id: 'officer-1' },
    actor_user_id: 'officer-1',
    event_type: eventType,
    id: `event-${sequenceNumber}`,
    occurred_at: `2026-08-0${sequenceNumber}T10:00:00Z`,
    payload,
    sequence_number: sequenceNumber,
  }
}
