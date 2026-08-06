import { describe, expect, it } from 'vitest'

import {
  createAppointmentSlotDirectoryUrlConfig,
  toAppointmentSlotDirectoryApiParams,
} from '@/features/appointments/model/appointment-slot-directory'

describe('appointment slot directory', () => {
  it('maps URL-owned filters and sort state to the backend contract', () => {
    const config = createAppointmentSlotDirectoryUrlConfig()

    expect(config.defaultSort).toEqual({ direction: 'asc', field: 'startsAt' })
    expect(
      toAppointmentSlotDirectoryApiParams({
        filters: {
          startsFrom: ['2026-08-10'],
          startsTo: ['2026-08-12'],
          status: ['BOOKED'],
        },
        page: 3,
        pageSize: 50,
        search: '',
        sort: { direction: 'desc', field: 'createdAt' },
      }),
    ).toEqual({
      order: 'desc',
      page: 3,
      size: 50,
      sort_by: 'created_at',
      starts_from: '2026-08-09T22:00:00.000Z',
      starts_to: '2026-08-12T21:59:59.999Z',
      status: 'BOOKED',
    })
  })

  it('drops invalid status and calendar-date values from the request', () => {
    expect(
      toAppointmentSlotDirectoryApiParams({
        filters: {
          startsFrom: ['not-a-date'],
          startsTo: ['2026-02-31'],
          status: ['EXPIRED'],
        },
        page: 1,
        pageSize: 20,
        search: '',
        sort: null,
      }),
    ).toEqual({
      order: 'asc',
      page: 1,
      size: 20,
      sort_by: 'starts_at',
      starts_from: undefined,
      starts_to: undefined,
      status: undefined,
    })
  })
})
