import { describe, expect, it } from 'vitest'

import {
  mapAppointmentSlotPage,
  mapAppointmentSlotResponse,
} from '@/features/appointments/model/appointment-slot-mapper'

const response = {
  created_at: '2026-08-01T08:00:00Z',
  ends_at: '2026-08-12T09:30:00Z',
  id: 'slot-1',
  office_id: 'office-1',
  starts_at: '2026-08-12T09:00:00Z',
  status: 'AVAILABLE' as const,
}

describe('appointment slot mapper', () => {
  it('isolates generated snake-case fields at the feature boundary', () => {
    expect(mapAppointmentSlotResponse(response)).toEqual({
      createdAt: '2026-08-01T08:00:00Z',
      endsAt: '2026-08-12T09:30:00Z',
      id: 'slot-1',
      officeId: 'office-1',
      startsAt: '2026-08-12T09:00:00Z',
      status: 'AVAILABLE',
    })
  })

  it('maps the shared pagination envelope', () => {
    expect(
      mapAppointmentSlotPage({
        data: [response],
        page: 2,
        pages: 4,
        size: 20,
        total: 61,
      }),
    ).toEqual({
      items: [mapAppointmentSlotResponse(response)],
      page: 2,
      pageCount: 4,
      pageSize: 20,
      totalItems: 61,
    })
  })
})
