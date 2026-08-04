import { describe, expect, it } from 'vitest'

import {
  createInfoDirectoryUrlConfig,
  toInfoDirectoryApiParams,
} from '@/features/infos/model/info-directory'
import { parseDataViewUrlState } from '@/shared/data-view/data-view-url-state'

describe('Info directory URL contract', () => {
  it('maps every supported non-geographic filter and server sort parameter', () => {
    const state = parseDataViewUrlState(
      new URLSearchParams(
        'search=stadtfest&office=office-1&category=EVENT&status=ACTIVE&startsFrom=2026-08-10&endsTo=2026-08-12&sortBy=updatedAt&sortDirection=desc&page=2&size=50',
      ),
      createInfoDirectoryUrlConfig(),
    )

    expect(toInfoDirectoryApiParams(state)).toEqual({
      category: 'EVENT',
      ends_to: '2026-08-12T21:59:59.999Z',
      office_id: 'office-1',
      order: 'desc',
      page: 2,
      q: 'stadtfest',
      size: 50,
      sort_by: 'updated_at',
      starts_from: '2026-08-09T22:00:00.000Z',
      status: 'ACTIVE',
    })
  })

  it('drops unsupported values and never sends a geographic filter', () => {
    const state = parseDataViewUrlState(
      new URLSearchParams(
        'category=UNKNOWN&status=ARCHIVED&startsFrom=not-a-date&endsTo=2026-02-31&bbox=1,2,3,4',
      ),
      createInfoDirectoryUrlConfig(),
    )
    const params = toInfoDirectoryApiParams(state)

    expect(params.category).toBeUndefined()
    expect(params.status).toBeUndefined()
    expect(params.starts_from).toBeUndefined()
    expect(params.ends_to).toBeUndefined()
    expect(params).not.toHaveProperty('bbox')
  })
})
