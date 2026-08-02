import { describe, expect, it } from 'vitest'

import { mapNullable, mapOptional } from '@/api/contract/mapper'
import { mapApiPage } from '@/api/contract/pagination'

/** Maps the minimal test DTO to the application naming convention. */
const mapUser = (dto: { first_name: string; id: string }) => ({
  firstName: dto.first_name,
  id: dto.id,
})

describe('API contract mappers', () => {
  it('keeps transport naming at the generated boundary', () => {
    expect(
      mapApiPage(
        {
          data: [{ first_name: 'Ada', id: 'user-1' }],
          page: 2,
          pages: 4,
          size: 20,
          total: 74,
        },
        mapUser,
      ),
    ).toEqual({
      items: [{ firstName: 'Ada', id: 'user-1' }],
      page: 2,
      pageCount: 4,
      pageSize: 20,
      totalItems: 74,
    })
  })

  it('preserves optional and nullable values', () => {
    expect(mapOptional(undefined, mapUser)).toBeUndefined()
    expect(mapNullable(null, mapUser)).toBeNull()
  })
})
