import { describe, expect, it } from 'vitest'

import {
  createDataViewSearchParams,
  getSingleFilterValue,
  parseDataViewUrlState,
} from '@/shared/data-view/data-view-url-state'

const config = {
  defaultPageSize: 20,
  defaultSort: { direction: 'desc', field: 'updatedAt' },
  filters: [{ key: 'status' }, { key: 'office', multiple: true }],
  pageSizeOptions: [10, 20, 50],
  sortFields: ['title', 'updatedAt'],
} as const

describe('data view URL state', () => {
  it('normalizes invalid paging and unsupported sorting', () => {
    const state = parseDataViewUrlState(
      new URLSearchParams(
        'page=-3&size=999&search=%20Lampe%20&sortBy=unknown&sortDirection=asc&status=OPEN&office=1&office=1&office=2',
      ),
      config,
    )

    expect(state).toEqual({
      filters: {
        office: ['1', '2'],
        status: ['OPEN'],
      },
      page: 1,
      pageSize: 20,
      search: 'Lampe',
      sort: { direction: 'desc', field: 'updatedAt' },
    })
    expect(getSingleFilterValue(state, 'status')).toBe('OPEN')
  })

  it('resets the page when filters change and preserves unrelated parameters', () => {
    const nextSearchParams = createDataViewSearchParams(
      new URLSearchParams(
        'page=4&size=50&search=alt&status=OPEN&office=1&returnTo=%2Faccount',
      ),
      config,
      {
        filters: { office: ['2', '3'], status: null },
        search: '  neu  ',
      },
      { resetPage: true },
    )

    expect(nextSearchParams.get('page')).toBeNull()
    expect(nextSearchParams.get('size')).toBe('50')
    expect(nextSearchParams.get('search')).toBe('neu')
    expect(nextSearchParams.get('status')).toBeNull()
    expect(nextSearchParams.getAll('office')).toEqual(['2', '3'])
    expect(nextSearchParams.get('returnTo')).toBe('/account')
  })

  it('omits defaults while serializing explicit sort and page values', () => {
    const nextSearchParams = createDataViewSearchParams(
      new URLSearchParams(),
      config,
      {
        page: 3,
        pageSize: 20,
        sort: { direction: 'asc', field: 'title' },
      },
    )

    expect(nextSearchParams.toString()).toBe(
      'page=3&sortBy=title&sortDirection=asc',
    )
  })
})
