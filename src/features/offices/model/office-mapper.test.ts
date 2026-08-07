import { describe, expect, it } from 'vitest'

import {
  mapOfficePage,
  mapOfficeResponse,
} from '@/features/offices/model/office-mapper'

const OFFICE_DTO = {
  address: {
    city: 'Leipzig',
    house_number: '12a',
    id: '00000000-0000-4000-8000-000000000020',
    latitude: 51.3397,
    longitude: 12.3731,
    street: 'Musterstraße',
    zip_code: '04109',
  },
  contact_email: 'ordnung@example.com',
  description: 'Zentrale Anlaufstelle',
  id: '00000000-0000-4000-8000-000000000010',
  metadata: {
    created_at: '2026-08-01T10:00:00Z',
    deactivated_at: null,
    is_active: true,
  },
  name: 'Ordnungsamt',
  opening_hours: {
    monday: '08:00-12:00, 13:00-16:00',
    tuesday: 'geschlossen',
  },
  phone: '+49 341 123456',
  services: ['Fundbüro', 'Gewerbeangelegenheiten'],
}

describe('office DTO mapping', () => {
  it('maps nested snake-case transport data into one complete feature model', () => {
    expect(mapOfficeResponse(OFFICE_DTO)).toEqual({
      address: {
        city: 'Leipzig',
        houseNumber: '12a',
        id: '00000000-0000-4000-8000-000000000020',
        latitude: 51.3397,
        longitude: 12.3731,
        street: 'Musterstraße',
        zipCode: '04109',
      },
      contactEmail: 'ordnung@example.com',
      createdAt: '2026-08-01T10:00:00Z',
      deactivatedAt: null,
      description: 'Zentrale Anlaufstelle',
      id: '00000000-0000-4000-8000-000000000010',
      isActive: true,
      name: 'Ordnungsamt',
      openingHours: {
        friday: null,
        monday: '08:00-12:00, 13:00-16:00',
        saturday: null,
        sunday: null,
        thursday: null,
        tuesday: 'geschlossen',
        wednesday: null,
      },
      phone: '+49 341 123456',
      services: ['Fundbüro', 'Gewerbeangelegenheiten'],
    })
  })

  it('maps the shared page envelope without leaking DTO names', () => {
    expect(
      mapOfficePage({
        data: [OFFICE_DTO],
        page: 2,
        pages: 3,
        size: 20,
        total: 45,
      }),
    ).toMatchObject({
      page: 2,
      pageCount: 3,
      pageSize: 20,
      totalItems: 45,
    })
  })
})
