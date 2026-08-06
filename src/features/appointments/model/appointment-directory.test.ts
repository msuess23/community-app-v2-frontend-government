import { describe, expect, it } from 'vitest'

import {
  createAppointmentDirectoryUrlConfig,
  toAppointmentDirectoryApiParams,
} from '@/features/appointments/model/appointment-directory'
import { parseDataViewUrlState } from '@/shared/data-view/data-view-url-state'

describe('appointment directory contract', () => {
  it('maps every supported URL filter and uses timezone-aware day boundaries', () => {
    const config = createAppointmentDirectoryUrlConfig()
    const state = parseDataViewUrlState(
      new URLSearchParams(
        'search=clara&status=SCHEDULED&citizen=citizen-1&ticket=ticket-1&startsFrom=2026-08-10&startsTo=2026-08-12&createdFrom=2026-08-01&createdTo=2026-08-02&sortBy=status&sortDirection=desc',
      ),
      config,
    )

    expect(toAppointmentDirectoryApiParams(state)).toEqual({
      citizen_id: 'citizen-1',
      created_from: '2026-07-31T22:00:00.000Z',
      created_to: '2026-08-02T21:59:59.999Z',
      order: 'desc',
      page: 1,
      q: 'clara',
      size: 20,
      sort_by: 'status',
      starts_from: '2026-08-09T22:00:00.000Z',
      starts_to: '2026-08-12T21:59:59.999Z',
      status: 'SCHEDULED',
      ticket_id: 'ticket-1',
    })
  })
})
