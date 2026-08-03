import { describe, expect, it } from 'vitest'

import {
  createOfficeDirectoryUrlConfig,
  getOfficeDirectoryAccess,
  toOfficeDirectoryApiParams,
} from '@/features/offices/model/office-directory'
import { parseDataViewUrlState } from '@/shared/data-view/data-view-url-state'

describe('office directory role scope', () => {
  it.each([
    ['ADMIN', true],
    ['DISPATCHER', false],
    ['OFFICER', false],
    ['MANAGER', false],
  ] as const)('derives permitted filters for %s', (role, canFilterByStatus) => {
    expect(getOfficeDirectoryAccess(role).canFilterByStatus).toBe(
      canFilterByStatus,
    )
  })

  it('maps administrator URL state to the generated office API parameters', () => {
    const access = getOfficeDirectoryAccess('ADMIN')
    const config = createOfficeDirectoryUrlConfig(access)
    const state = parseDataViewUrlState(
      new URLSearchParams(
        'search=ordnung&status=all&page=2&size=50&sortBy=createdAt&sortDirection=desc',
      ),
      config,
    )

    expect(toOfficeDirectoryApiParams(state, access)).toEqual({
      order: 'desc',
      page: 2,
      q: 'ordnung',
      size: 50,
      sort_by: 'created_at',
      status: 'all',
    })
  })

  it('forces active lifecycle scope and ignores status URLs for non-admin roles', () => {
    const access = getOfficeDirectoryAccess('OFFICER')
    const config = createOfficeDirectoryUrlConfig(access)
    const state = parseDataViewUrlState(
      new URLSearchParams(
        'status=inactive&sortBy=contactEmail&sortDirection=asc',
      ),
      config,
    )

    expect(toOfficeDirectoryApiParams(state, access)).toMatchObject({
      sort_by: 'contact_email',
      status: 'active',
    })
  })
})
