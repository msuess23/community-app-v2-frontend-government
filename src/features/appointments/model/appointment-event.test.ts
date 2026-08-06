import { describe, expect, it } from 'vitest'

import {
  mapAppointmentEventResponse,
  parseAppointmentEventPayload,
} from '@/features/appointments/model/appointment-event'

describe('appointment event model', () => {
  it('maps actor references and validates known payloads locally', () => {
    const event = mapAppointmentEventResponse({
      actor: { display_name: 'Mara Management', id: 'manager-1' },
      actor_user_id: 'manager-1',
      event_type: 'APPOINTMENT_RESCHEDULED',
      id: 'event-2',
      occurred_at: '2026-08-02T09:00:00Z',
      payload: {
        new_ends_at: '2026-08-13T10:30:00Z',
        new_slot_id: 'slot-2',
        new_starts_at: '2026-08-13T10:00:00Z',
        previous_ends_at: '2026-08-12T09:30:00Z',
        previous_slot_id: 'slot-1',
        previous_starts_at: '2026-08-12T09:00:00Z',
        reason: 'Bürgerwunsch',
      },
      sequence_number: 2,
    })

    expect(event.actor?.label).toBe('Mara Management')
    expect(
      parseAppointmentEventPayload(event, 'APPOINTMENT_RESCHEDULED'),
    ).toMatchObject({ reason: 'Bürgerwunsch' })
  })

  it('returns null for malformed known payloads and preserves unknown events', () => {
    const event = mapAppointmentEventResponse({
      actor: null,
      actor_user_id: null,
      event_type: 'APPOINTMENT_COMPLETED',
      id: 'event-3',
      occurred_at: '2026-08-02T09:00:00Z',
      payload: { comment: 123 },
      sequence_number: 3,
    })

    expect(parseAppointmentEventPayload(event, 'APPOINTMENT_COMPLETED')).toBeNull()
    expect(event.payload).toEqual({ comment: 123 })
  })
})
