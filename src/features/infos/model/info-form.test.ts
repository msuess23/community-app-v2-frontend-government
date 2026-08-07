import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import type { AuthUser } from '@/auth/auth-types'
import {
  applyInfoSubmissionError,
  createEmptyInfoFormValues,
  createInfoFormSchema,
  hasInfoChanges,
  toInfoCreate,
  toInfoFormValues,
  toInfoUpdate,
} from '@/features/infos/model/info-form'
import type { InfoRecord } from '@/features/infos/model/info-model'

const officer: AuthUser = {
  email: 'officer@example.com',
  firstName: 'Olivia',
  id: 'user-1',
  lastName: 'Officer',
  officeId: 'office-1',
  role: 'OFFICER',
}
const admin: AuthUser = { ...officer, officeId: null, role: 'ADMIN' }

describe('Info form mapping', () => {
  it('creates an Info for the case worker office with timezone-aware boundaries', () => {
    const values = createEmptyInfoFormValues(officer)
    values.title = 'Straßensperrung Innenstadt'
    values.category = 'CONSTRUCTION'
    values.startsAt = '2026-08-12T17:00'
    values.endsAt = '2026-08-12T20:00'

    expect(toInfoCreate(values, officer)).toEqual({
      address: null,
      category: 'CONSTRUCTION',
      description: null,
      ends_at: '2026-08-12T18:00:00.000Z',
      office_id: 'office-1',
      starts_at: '2026-08-12T15:00:00.000Z',
      title: 'Straßensperrung Innenstadt',
    })
  })

  it('allows administrators to create a cross-office Info', () => {
    const values = createEmptyInfoFormValues(admin)
    values.title = 'Allgemeine Bekanntmachung'
    values.startsAt = '2026-08-12T09:00'
    values.endsAt = '2026-08-12T10:00'

    expect(toInfoCreate(values, admin).office_id).toBeNull()
  })

  it('builds a minimal partial update and preserves hidden coordinates', () => {
    const info = infoRecord()
    const values = toInfoFormValues(info)
    values.description = 'Aktualisierte Beschreibung'
    values.address.city = 'Markkleeberg'

    expect(toInfoUpdate(values, info, admin)).toEqual({
      address: { city: 'Markkleeberg' },
      description: 'Aktualisierte Beschreibung',
    })
    expect(hasInfoChanges(values, info, admin)).toBe(true)
  })

  it('does not truncate hidden seconds when only another field changes', () => {
    const info = {
      ...infoRecord(),
      startsAt: '2026-08-12T15:00:45Z',
      endsAt: '2026-08-12T18:00:30Z',
    }
    const values = toInfoFormValues(info)
    values.description = 'Nur der Text wurde geändert'

    expect(toInfoUpdate(values, info, admin)).toEqual({
      description: 'Nur der Text wurde geändert',
    })
  })

  it('sends explicit null when an optional association or address is removed', () => {
    const info = infoRecord()
    const values = toInfoFormValues(info)
    values.officeId = ''
    values.address.enabled = false

    expect(toInfoUpdate(values, info, admin)).toEqual({
      address: null,
      office_id: null,
    })
  })

  it('translates a missing status projection during an update', () => {
    const setError = vi.fn()
    const errors = applyInfoSubmissionError(
      new ApiError({
        errorCode: 'INFO_STATUS_NOT_FOUND',
        message: 'Info status not found',
        status: 404,
      }),
      setError,
    )

    expect(errors).toEqual([
      {
        message:
          'Für diese Mitteilung fehlt der aktuelle Status. Der Datenbestand muss administrativ geprüft werden.',
      },
    ])
    expect(setError).not.toHaveBeenCalled()
  })

  it('rejects incomplete addresses and invalid time windows', () => {
    const values = createEmptyInfoFormValues(officer)
    values.title = 'Mitteilung'
    values.startsAt = '2026-08-12T10:00'
    values.endsAt = '2026-08-12T09:00'
    values.address.enabled = true

    const result = createInfoFormSchema().safeParse(values)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
        expect.arrayContaining(['endsAt', 'address.street', 'address.city']),
      )
    }
  })
})

function infoRecord(): InfoRecord {
  return {
    address: {
      city: 'Leipzig',
      houseNumber: '12a',
      latitude: 51.34,
      longitude: 12.37,
      street: 'Musterstraße',
      zipCode: '04109',
    },
    category: 'EVENT',
    createdAt: '2026-08-01T08:00:00Z',
    currentStatus: {
      createdAt: '2026-08-01T08:00:00Z',
      id: 'status-1',
      message: 'Created',
      status: 'SCHEDULED',
    },
    description: 'Beschreibung',
    endsAt: '2026-08-12T18:00:00Z',
    id: 'info-1',
    imageUrl: null,
    officeId: 'office-1',
    startsAt: '2026-08-12T15:00:00Z',
    title: 'Stadtteilfest',
    updatedAt: '2026-08-01T08:00:00Z',
  }
}
