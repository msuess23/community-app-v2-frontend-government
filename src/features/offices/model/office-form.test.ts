import { describe, expect, it } from 'vitest'

import {
  createEmptyOfficeFormValues,
  createOfficeFormSchema,
  hasOfficeChanges,
  toOfficeCreate,
  toOfficeFormValues,
  toOfficeUpdate,
} from '@/features/offices/model/office-form'
import type { OfficeRecord } from '@/features/offices/model/office-model'

const OFFICE: OfficeRecord = {
  address: {
    city: 'Leipzig',
    houseNumber: '12a',
    id: 'address-1',
    latitude: 51.3397,
    longitude: 12.3731,
    street: 'Musterstraße',
    zipCode: '04109',
  },
  contactEmail: 'ordnung@example.com',
  createdAt: '2026-08-01T10:00:00Z',
  deactivatedAt: null,
  description: 'Zentrale Anlaufstelle',
  id: 'office-1',
  isActive: true,
  name: 'Ordnungsamt',
  openingHours: {
    friday: null,
    monday: '08:00-12:00, 13:00-16:00',
    saturday: 'geschlossen',
    sunday: null,
    thursday: null,
    tuesday: null,
    wednesday: null,
  },
  phone: '+49 341 123456',
  services: ['Fundbüro', 'Gewerbeangelegenheiten'],
}

describe('office form mapping', () => {
  it('creates normalized structured office data without temporary coordinates', () => {
    const values = createEmptyOfficeFormValues()
    values.name = '  Bürger   Service  '
    values.description = '  Hilfe vor Ort  '
    values.contactEmail = 'SERVICE@example.com'
    values.phone = '+49 30 123 45'
    values.services = [{ value: ' Ausweise ' }, { value: 'Meldewesen' }]
    values.openingHours.monday = {
      intervals: [
        { end: '16:00', start: '13:00' },
        { end: '12:00', start: '08:00' },
      ],
      mode: 'open',
    }
    values.openingHours.saturday = { intervals: [], mode: 'closed' }
    values.address = {
      city: ' Berlin ',
      enabled: true,
      houseNumber: ' 7 ',
      street: ' Rathausstraße ',
      zipCode: ' 10178 ',
    }

    expect(toOfficeCreate(values)).toEqual({
      address: {
        city: 'Berlin',
        house_number: '7',
        street: 'Rathausstraße',
        zip_code: '10178',
      },
      contact_email: 'SERVICE@example.com',
      description: 'Hilfe vor Ort',
      name: 'Bürger Service',
      opening_hours: {
        monday: '08:00-12:00, 13:00-16:00',
        saturday: 'geschlossen',
      },
      phone: '+49 30 123 45',
      services: ['Ausweise', 'Meldewesen'],
    })
  })

  it('builds a minimal patch and leaves stored coordinates untouched', () => {
    const values = toOfficeFormValues(OFFICE)
    values.description = 'Neue Beschreibung'
    values.address.city = 'Markkleeberg'
    values.changeReason = '  Zuständigkeit angepasst  '

    expect(toOfficeUpdate(values, OFFICE)).toEqual({
      address: { city: 'Markkleeberg' },
      change_reason: 'Zuständigkeit angepasst',
      description: 'Neue Beschreibung',
    })
    expect(hasOfficeChanges(values, OFFICE)).toBe(true)
  })

  it('distinguishes explicit clearing from unchanged optional data', () => {
    const values = toOfficeFormValues(OFFICE)
    values.address.enabled = false
    values.contactEmail = ''
    values.description = ''
    values.openingHours = createEmptyOfficeFormValues().openingHours
    values.phone = ''
    values.services = []
    values.changeReason = 'Stammdaten bereinigt'

    expect(toOfficeUpdate(values, OFFICE)).toEqual({
      address: null,
      change_reason: 'Stammdaten bereinigt',
      contact_email: null,
      description: null,
      opening_hours: null,
      phone: null,
      services: [],
    })
  })

  it('rejects incomplete addresses, duplicate services, and overlapping intervals', () => {
    const values = createEmptyOfficeFormValues()
    values.name = 'Testamt'
    values.address.enabled = true
    values.address.street = 'A'
    values.services = [{ value: 'Ausweis' }, { value: ' ausweis ' }]
    values.openingHours.monday = {
      intervals: [
        { end: '12:00', start: '08:00' },
        { end: '13:00', start: '11:00' },
      ],
      mode: 'open',
    }

    const result = createOfficeFormSchema('create').safeParse(values)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
        expect.arrayContaining([
          'address.street',
          'address.houseNumber',
          'address.zipCode',
          'address.city',
          'services.1.value',
          'openingHours.monday.intervals.1.start',
        ]),
      )
    }
  })

  it('does not consider normalized unchanged values a master-data change', () => {
    const values = toOfficeFormValues(OFFICE)
    values.name = '  Ordnungsamt  '
    values.description = 'Zentrale   Anlaufstelle'
    values.changeReason = 'Nur ein Test'

    expect(hasOfficeChanges(values, OFFICE)).toBe(false)
  })
})
