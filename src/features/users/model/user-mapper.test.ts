import { describe, expect, it } from 'vitest'

import { mapUserPage, mapUserResponse } from '@/features/users/model/user-mapper'

const USER_DTO = {
  email: 'ada@example.test',
  first_name: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  last_name: 'Lovelace',
  metadata: {
    created_at: '2026-08-01T10:00:00Z',
    deactivated_at: null,
    is_active: true,
  },
  office_id: '00000000-0000-4000-8000-000000000010',
  role: 'OFFICER' as const,
}

describe('user DTO mapping', () => {
  it('maps snake-case transport fields into one feature model', () => {
    expect(mapUserResponse(USER_DTO)).toEqual({
      createdAt: '2026-08-01T10:00:00Z',
      deactivatedAt: null,
      email: 'ada@example.test',
      firstName: 'Ada',
      id: '00000000-0000-4000-8000-000000000001',
      isActive: true,
      lastName: 'Lovelace',
      officeId: '00000000-0000-4000-8000-000000000010',
      role: 'OFFICER',
    })
  })

  it('maps the shared page envelope without leaking DTO names', () => {
    expect(
      mapUserPage({ data: [USER_DTO], page: 2, pages: 3, size: 20, total: 45 }),
    ).toMatchObject({
      page: 2,
      pageCount: 3,
      pageSize: 20,
      totalItems: 45,
    })
  })
})
