import { describe, expect, it } from 'vitest'

import {
  createOfficeHistoryUrlConfig,
  getOfficeHistoryDateRange,
  mapOfficeHistoryPage,
  toOfficeHistoryApiParams,
} from '@/features/offices/model/office-history'
import { parseDataViewUrlState } from '@/shared/data-view/data-view-url-state'

describe('office history model', () => {
  it('maps complete immutable snapshots and historical addresses', () => {
    expect(
      mapOfficeHistoryPage({
        data: [
          {
            address_snapshot: {
              city: 'Leipzig',
              formatted: 'Alte Straße 4, 04109 Leipzig',
              house_number: '4',
              latitude: 51.3397,
              longitude: 12.3731,
              street: 'Alte Straße',
              zip_code: '04109',
            },
            change_reason: 'Adresse aktualisiert',
            changed_at: '2026-08-03T10:00:00Z',
            changed_by_user_id: 'actor-1',
            contact_email: 'office@example.test',
            description: 'Historischer Stand',
            id: 'history-1',
            is_active: true,
            name: 'Ordnungsamt',
            office_id: 'office-1',
            opening_hours: {
              monday: '08:00-12:00',
              unexpected: 42,
            },
            phone: '+49 341 1234',
            services: ['Fundbüro'],
          },
        ],
        page: 1,
        pages: 1,
        size: 20,
        total: 1,
      }).items[0],
    ).toMatchObject({
      address: {
        city: 'Leipzig',
        street: 'Alte Straße',
      },
      changeReason: 'Adresse aktualisiert',
      openingHours: {
        monday: '08:00-12:00',
        tuesday: null,
      },
      services: ['Fundbüro'],
    })
  })

  it('maps URL calendar dates to inclusive timezone-aware query boundaries', () => {
    const state = parseDataViewUrlState(
      new URLSearchParams('startDate=2026-08-01&endDate=2026-08-03&page=2'),
      createOfficeHistoryUrlConfig(),
    )

    expect(getOfficeHistoryDateRange(state)).toEqual({
      endDate: '2026-08-03',
      isInvalid: false,
      startDate: '2026-08-01',
    })
    expect(toOfficeHistoryApiParams(state)).toEqual({
      end_date: '2026-08-03T21:59:59.999Z',
      page: 2,
      size: 20,
      start_date: '2026-07-31T22:00:00.000Z',
    })
  })

  it('detects an invalid calendar range before requesting the backend', () => {
    const state = parseDataViewUrlState(
      new URLSearchParams('startDate=2026-08-04&endDate=2026-08-03'),
      createOfficeHistoryUrlConfig(),
    )

    expect(getOfficeHistoryDateRange(state).isInvalid).toBe(true)
  })
})
