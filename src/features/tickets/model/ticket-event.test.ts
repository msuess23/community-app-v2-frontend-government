import { describe, expect, it } from 'vitest'

import {
  findTicketEventOffice,
  findTicketEventUser,
  mapTicketEventResponse,
  parseTicketEventPayload,
} from '@/features/tickets/model/ticket-event'

describe('ticket event boundary', () => {
  it('maps actor and response-only references without changing the payload', () => {
    const payload = {
      comment: 'Bitte übernehmen.',
      target_user_id: 'officer-2',
    }
    const event = mapTicketEventResponse({
      actor: { display_name: 'Olaf Ordnung', id: 'officer-1' },
      actor_user_id: 'officer-1',
      event_type: 'TICKET_FORWARDED',
      id: 'event-4',
      occurred_at: '2026-08-02T10:00:00Z',
      payload,
      references: {
        offices: [{ id: 'office-1', name: 'Tiefbauamt' }],
        users: [{ display_name: 'Erika Beispiel', id: 'officer-2' }],
      },
      sequence_number: 4,
      ticket_id: 'ticket-1',
    })

    expect(event.payload).toEqual(payload)
    expect(event.payload).not.toBe(payload)
    expect(event.actor).toEqual({ id: 'officer-1', label: 'Olaf Ordnung' })
    expect(findTicketEventUser(event, 'officer-2')?.displayName).toBe(
      'Erika Beispiel',
    )
    expect(findTicketEventOffice(event, 'office-1')?.name).toBe('Tiefbauamt')
  })

  it('rejects malformed known payloads locally without rejecting the event record', () => {
    const event = mapTicketEventResponse({
      actor: { display_name: 'Olaf Ordnung', id: 'officer-1' },
      actor_user_id: 'officer-1',
      event_type: 'TICKET_FORWARDED',
      id: 'event-4',
      occurred_at: '2026-08-02T10:00:00Z',
      payload: { target_user_id: 42 },
      sequence_number: 4,
      ticket_id: 'ticket-1',
    })

    expect(parseTicketEventPayload(event, 'TICKET_FORWARDED')).toBeNull()
    expect(event.eventType).toBe('TICKET_FORWARDED')
  })
})
