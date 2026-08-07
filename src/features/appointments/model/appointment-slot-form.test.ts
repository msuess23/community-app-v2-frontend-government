import { describe, expect, it } from 'vitest'

import {
  createAppointmentSlotBatchSchema,
  getAppointmentSlotBatchPreview,
  toAppointmentSlotBatchCreate,
} from '@/features/appointments/model/appointment-slot-form'
import { toZonedDateTimeIso } from '@/shared/format/local-date-time'

describe('appointment slot batch form', () => {
  const schema = createAppointmentSlotBatchSchema(
    () => new Date('2026-08-06T08:00:00Z'),
  )

  it('rejects past, inverted and overlapping intervals with row-level paths', () => {
    const result = schema.safeParse({
      slots: [
        { endsAt: '2026-08-06T09:30', startsAt: '2026-08-06T09:00' },
        { endsAt: '2026-08-06T10:00', startsAt: '2026-08-06T09:15' },
        { endsAt: '2026-08-06T10:00', startsAt: '2026-08-06T11:00' },
      ],
    })

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ['slots', 1, 'startsAt'] }),
        expect.objectContaining({ path: ['slots', 2, 'endsAt'] }),
      ]),
    )
  })

  it('detects overlaps against the furthest-ending earlier interval', () => {
    const result = schema.safeParse({
      slots: [
        { endsAt: '2099-08-12T12:00', startsAt: '2099-08-12T09:00' },
        { endsAt: '2099-08-12T11:00', startsAt: '2099-08-12T10:00' },
        { endsAt: '2099-08-12T13:00', startsAt: '2099-08-12T11:00' },
      ],
    })

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }

    expect(result.error.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([
        ['slots', 1, 'startsAt'],
        ['slots', 2, 'startsAt'],
      ]),
    )
  })

  it('accepts the backend maximum of 100 non-overlapping rows', () => {
    const slots = Array.from({ length: 100 }, (_, index) => {
      const day = new Date(Date.UTC(2099, 0, index + 1))
        .toISOString()
        .slice(0, 10)

      return {
        endsAt: `${day}T09:30`,
        startsAt: `${day}T09:00`,
      }
    })

    expect(schema.safeParse({ slots }).success).toBe(true)
  })

  it('rejects batches above the backend limit of 100 rows', () => {
    const result = schema.safeParse({
      slots: Array.from({ length: 101 }, (_, index) => ({
        endsAt: `2099-08-${String((index % 20) + 1).padStart(2, '0')}T10:30`,
        startsAt: `2099-08-${String((index % 20) + 1).padStart(2, '0')}T10:00`,
      })),
    })

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ['slots'] }),
      ]),
    )
  })

  it('sorts valid intervals before preview and transport mapping', () => {
    const values = {
      slots: [
        { endsAt: '2099-08-12T12:30', startsAt: '2099-08-12T12:00' },
        { endsAt: '2099-08-12T10:00', startsAt: '2099-08-12T09:30' },
      ],
    }

    expect(
      getAppointmentSlotBatchPreview(values).map((slot) => slot.originalIndex),
    ).toEqual([1, 0])
    expect(toAppointmentSlotBatchCreate(values)).toEqual({
      slots: [
        {
          ends_at: toZonedDateTimeIso('2099-08-12T10:00'),
          starts_at: toZonedDateTimeIso('2099-08-12T09:30'),
        },
        {
          ends_at: toZonedDateTimeIso('2099-08-12T12:30'),
          starts_at: toZonedDateTimeIso('2099-08-12T12:00'),
        },
      ],
    })
  })
})
