import type { AppointmentResponse } from '@/api/generated/models'
import { describe, expect, it } from 'vitest'

import {
  mapAppointmentFilterOptions,
  mapAppointmentResponse,
} from '@/features/appointments/model/appointment-mapper'

describe('appointment mapper', () => {
  it('maps embedded references and preserves server-approved actions', () => {
    expect(mapAppointmentResponse(appointmentResponse())).toEqual(
      expect.objectContaining({
        allowedActions: ['RESCHEDULE', 'CANCEL'],
        citizen: { displayName: 'Clara Bürgerin', id: 'citizen-1' },
        office: { id: 'office-1', name: 'Bürgeramt' },
        ticket: {
          canView: false,
          id: 'ticket-1',
          title: 'Anliegen zur Ummeldung',
        },
      }),
    )
  })

  it('maps office-scoped readable filter options', () => {
    expect(
      mapAppointmentFilterOptions({
        citizens: [{ display_name: 'Clara Bürgerin', id: 'citizen-1' }],
        tickets: [
          { can_view: true, id: 'ticket-1', title: 'Anliegen zur Ummeldung' },
        ],
      }),
    ).toEqual({
      citizens: [{ displayName: 'Clara Bürgerin', id: 'citizen-1' }],
      tickets: [
        { canView: true, id: 'ticket-1', title: 'Anliegen zur Ummeldung' },
      ],
    })
  })
})

function appointmentResponse(): AppointmentResponse {
  return {
    allowed_actions: ['RESCHEDULE', 'CANCEL'],
    cancelled_at: null,
    citizen: { display_name: 'Clara Bürgerin', id: 'citizen-1' },
    citizen_id: 'citizen-1',
    completed_at: null,
    created_at: '2026-08-01T08:00:00Z',
    current_slot_id: 'slot-1',
    ends_at: '2026-08-12T09:30:00Z',
    id: 'appointment-1',
    office: { id: 'office-1', name: 'Bürgeramt' },
    office_id: 'office-1',
    reason: 'Ummeldung des Wohnsitzes',
    starts_at: '2026-08-12T09:00:00Z',
    status: 'SCHEDULED',
    ticket: {
      can_view: false,
      id: 'ticket-1',
      title: 'Anliegen zur Ummeldung',
    },
    ticket_id: 'ticket-1',
    updated_at: '2026-08-02T08:00:00Z',
    version: 1,
  }
}
