import { describe, expect, it } from 'vitest'

import {
  compactQueryParameters,
  createResourceQueryKeys,
} from '@/shared/remote-data/query-keys'

describe('compactQueryParameters', () => {
  it('removes undefined filters but preserves explicit empty values', () => {
    expect(
      compactQueryParameters({
        active: false,
        officeId: undefined,
        page: 1,
        search: '',
      }),
    ).toEqual({ active: false, page: 1, search: '' })
  })
})

describe('createResourceQueryKeys', () => {
  const ticketKeys = createResourceQueryKeys<
    { page: number; search?: string },
    string
  >('tickets')

  it('creates prefixes that support targeted invalidation', () => {
    expect(ticketKeys.all).toEqual(['resource', 'tickets'])
    expect(ticketKeys.lists()).toEqual(['resource', 'tickets', 'list'])
    expect(ticketKeys.details()).toEqual(['resource', 'tickets', 'detail'])
    expect(ticketKeys.detail('ticket-1')).toEqual([
      'resource',
      'tickets',
      'detail',
      'ticket-1',
    ])
  })

  it('normalizes list parameters and supports event-style related data', () => {
    expect(ticketKeys.list({ page: 2, search: undefined })).toEqual([
      'resource',
      'tickets',
      'list',
      { page: 2 },
    ])
    expect(
      ticketKeys.related('ticket-1', 'events', {
        afterSequence: undefined,
        page: 1,
      }),
    ).toEqual([
      'resource',
      'tickets',
      'detail',
      'ticket-1',
      'events',
      { page: 1 },
    ])
  })

  it('rejects empty scopes and relation names', () => {
    expect(() => createResourceQueryKeys('   ')).toThrow(
      'A query key scope must not be empty.',
    )
    expect(() => ticketKeys.related('ticket-1', '  ')).toThrow(
      'A related query key segment must not be empty.',
    )
  })
})
