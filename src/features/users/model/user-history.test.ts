import { describe, expect, it } from 'vitest'

import {
  createUserHistoryUrlConfig,
  getUserHistoryDateRange,
  mapUserHistoryPage,
  toUserHistoryApiParams,
} from '@/features/users/model/user-history'
import { parseDataViewUrlState } from '@/shared/data-view/data-view-url-state'

describe('user history model', () => {
  it('maps immutable snapshots and page metadata', () => {
    expect(
      mapUserHistoryPage({
        data: [
          {
            change_reason: 'Rolle angepasst',
            changed_at: '2026-08-03T10:00:00Z',
            changed_by_user_id: 'actor-1',
            email: 'person@example.test',
            first_name: 'Petra',
            id: 'history-1',
            is_active: true,
            last_name: 'Person',
            office_id: null,
            role: 'MANAGER',
            user_id: 'user-1',
          },
        ],
        page: 1,
        pages: 1,
        size: 20,
        total: 1,
      }).items[0],
    ).toMatchObject({
      changeReason: 'Rolle angepasst',
      changedByUserId: 'actor-1',
      firstName: 'Petra',
      officeId: null,
      role: 'MANAGER',
    })
  })

  it('orders each history page from the newest snapshot into the past', () => {
    const page = mapUserHistoryPage({
      data: [
        {
          change_reason: 'Älter',
          changed_at: '2026-08-01T10:00:00Z',
          changed_by_user_id: 'actor-1',
          email: 'person@example.test',
          first_name: 'Petra',
          id: 'history-1',
          is_active: true,
          last_name: 'Person',
          office_id: null,
          role: 'OFFICER',
          user_id: 'user-1',
        },
        {
          change_reason: 'Neuer',
          changed_at: '2026-08-03T10:00:00Z',
          changed_by_user_id: 'actor-1',
          email: 'person@example.test',
          first_name: 'Petra',
          id: 'history-2',
          is_active: true,
          last_name: 'Person',
          office_id: null,
          role: 'MANAGER',
          user_id: 'user-1',
        },
      ],
      page: 1,
      pages: 1,
      size: 20,
      total: 2,
    })

    expect(page.items.map((item) => item.id)).toEqual([
      'history-2',
      'history-1',
    ])
  })

  it('maps URL calendar dates to inclusive timezone-aware query boundaries', () => {
    const state = parseDataViewUrlState(
      new URLSearchParams('startDate=2026-08-01&endDate=2026-08-03&page=2'),
      createUserHistoryUrlConfig(),
    )

    expect(getUserHistoryDateRange(state)).toEqual({
      endDate: '2026-08-03',
      isInvalid: false,
      startDate: '2026-08-01',
    })
    expect(toUserHistoryApiParams(state)).toEqual({
      end_date: '2026-08-03T21:59:59.999Z',
      page: 2,
      size: 20,
      start_date: '2026-07-31T22:00:00.000Z',
    })
  })

  it('detects an invalid calendar range before requesting the backend', () => {
    const state = parseDataViewUrlState(
      new URLSearchParams('startDate=2026-08-04&endDate=2026-08-03'),
      createUserHistoryUrlConfig(),
    )

    expect(getUserHistoryDateRange(state).isInvalid).toBe(true)
  })
})
