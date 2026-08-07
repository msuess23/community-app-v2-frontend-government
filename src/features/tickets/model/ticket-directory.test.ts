import { describe, expect, it } from 'vitest'

import {
  createTicketDirectoryUrlConfig,
  getTicketLifecycleControlValue,
  toTicketDirectoryApiParams,
} from '@/features/tickets/model/ticket-directory'
import { parseDataViewUrlState } from '@/shared/data-view/data-view-url-state'

describe('ticket directory URL contract', () => {
  it('maps supported filters, dates and server-side sorting', () => {
    const state = parseDataViewUrlState(
      new URLSearchParams(
        'search=schlagloch&lifecycle=completed&workflowState=COMPLETED&status=RESOLVED&category=INFRASTRUCTURE&office=office-1&createdFrom=2026-08-01&createdTo=2026-08-02&updatedFrom=2026-08-03&updatedTo=2026-08-04&sortBy=title&sortDirection=asc&page=2&size=50',
      ),
      createTicketDirectoryUrlConfig(),
    )

    expect(toTicketDirectoryApiParams(state)).toEqual({
      category: 'INFRASTRUCTURE',
      created_from: '2026-07-31T22:00:00.000Z',
      created_to: '2026-08-02T21:59:59.999Z',
      lifecycle: 'completed',
      office_id: 'office-1',
      order: 'asc',
      page: 2,
      q: 'schlagloch',
      size: 50,
      sort_by: 'title',
      status: 'RESOLVED',
      updated_from: '2026-08-02T22:00:00.000Z',
      updated_to: '2026-08-04T21:59:59.999Z',
      workflow_state: 'COMPLETED',
    })
  })

  it('uses active tickets and recent updates as the implicit defaults', () => {
    const state = parseDataViewUrlState(
      new URLSearchParams(),
      createTicketDirectoryUrlConfig(),
    )

    expect(toTicketDirectoryApiParams(state)).toEqual({
      category: undefined,
      created_from: undefined,
      created_to: undefined,
      lifecycle: undefined,
      office_id: undefined,
      order: 'desc',
      page: 1,
      q: undefined,
      size: 20,
      sort_by: 'updated_at',
      status: undefined,
      updated_from: undefined,
      updated_to: undefined,
      workflow_state: undefined,
    })
    expect(getTicketLifecycleControlValue('active')).toBe('')
  })

  it('drops unsupported values and truncates search text to 200 characters', () => {
    const state = parseDataViewUrlState(
      new URLSearchParams(
        `search=${'x'.repeat(240)}&lifecycle=unknown&workflowState=INVALID&status=UNKNOWN&category=UNKNOWN&createdFrom=no-date`,
      ),
      createTicketDirectoryUrlConfig(),
    )
    const params = toTicketDirectoryApiParams(state)

    expect(params.q).toHaveLength(200)
    expect(params.lifecycle).toBeUndefined()
    expect(params.workflow_state).toBeUndefined()
    expect(params.status).toBeUndefined()
    expect(params.category).toBeUndefined()
    expect(params.created_from).toBeUndefined()
  })
})
