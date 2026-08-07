import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { TicketEventTimeline } from '@/features/tickets/components/TicketEventTimeline'
import { mockApiServer } from '@/test/server'

const TICKET_ID = '00000000-0000-4000-8000-000000000100'

describe('TicketEventTimeline', () => {
  it('loads newest-first event pages without deriving the current projection', async () => {
    const requestedPages: string[] = []
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/events`,
        ({ request }) => {
          const page = new URL(request.url).searchParams.get('page') ?? '1'
          requestedPages.push(page)
          return HttpResponse.json({
            data: [
              page === '1'
                ? eventResponse(2, 'TICKET_DISPATCHED', {
                    comment: null,
                    office_id: 'office-1',
                  })
                : eventResponse(1, 'TICKET_SUBMITTED', {
                    category: 'INFRASTRUCTURE',
                    creator_user_id: 'citizen-1',
                    description: 'Schlagloch am Fahrbahnrand.',
                    title: 'Schlagloch',
                    visibility: 'PUBLIC',
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
        <TicketEventTimeline ticketId={TICKET_ID} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Ticket disponiert')).toBeVisible()
    expect(screen.queryByText('Ticket eingereicht')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Ältere Ereignisse laden' }),
    )

    expect(await screen.findByText('Ticket eingereicht')).toBeVisible()
    const events = screen.getAllByRole('listitem')
    expect(events[0]).toHaveTextContent('Ticket disponiert')
    expect(events[1]).toHaveTextContent('Ticket eingereicht')
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
    references: {
      offices: [{ id: 'office-1', name: 'Tiefbauamt' }],
      users: [],
    },
    sequence_number: sequenceNumber,
    ticket_id: TICKET_ID,
  }
}
