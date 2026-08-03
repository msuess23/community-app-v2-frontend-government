import { describe, expect, it } from 'vitest'

import {
  createUserDirectoryUrlConfig,
  getUserDirectoryAccess,
  toUserDirectoryApiParams,
} from '@/features/users/model/user-directory'
import { parseDataViewUrlState } from '@/shared/data-view/data-view-url-state'

describe('user directory role scope', () => {
  it.each([
    ['ADMIN', true, true, true],
    ['DISPATCHER', true, false, false],
    ['OFFICER', false, false, false],
    ['MANAGER', false, false, false],
  ] as const)(
    'derives permitted filters for %s',
    (role, canFilterByOffice, canFilterByStatus, canSeeCitizens) => {
      const access = getUserDirectoryAccess(role)

      expect(access.canFilterByOffice).toBe(canFilterByOffice)
      expect(access.canFilterByStatus).toBe(canFilterByStatus)
      expect(access.roleOptions.includes('CITIZEN')).toBe(canSeeCitizens)
    },
  )

  it('maps admin URL state to generated API parameters', () => {
    const access = getUserDirectoryAccess('ADMIN')
    const config = createUserDirectoryUrlConfig(access)
    const state = parseDataViewUrlState(
      new URLSearchParams(
        'search=ada&role=CITIZEN&office=office-1&status=all&page=2&size=50&sortBy=createdAt&sortDirection=desc',
      ),
      config,
    )

    expect(toUserDirectoryApiParams(state, access)).toEqual({
      office_id: 'office-1',
      order: 'desc',
      page: 2,
      q: 'ada',
      role: 'CITIZEN',
      size: 50,
      sort_by: 'created_at',
      status: 'all',
    })
  })

  it('drops URL filters that are outside a case worker scope', () => {
    const access = getUserDirectoryAccess('OFFICER')
    const config = createUserDirectoryUrlConfig(access)
    const state = parseDataViewUrlState(
      new URLSearchParams(
        'role=CITIZEN&office=outside&status=inactive&sortBy=lastName&sortDirection=asc',
      ),
      config,
    )

    expect(toUserDirectoryApiParams(state, access)).toMatchObject({
      office_id: undefined,
      role: undefined,
      status: undefined,
    })
  })
})
