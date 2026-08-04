import { describe, expect, it } from 'vitest'

import {
  isValidLocalDateTime,
  toLocalDateTimeInputValue,
  toZonedDateTimeIso,
} from '@/shared/format/local-date-time'

describe('local date-time formatting', () => {
  it('maps Berlin summer and winter wall-clock values to backend instants', () => {
    expect(toZonedDateTimeIso('2026-08-12T17:00')).toBe(
      '2026-08-12T15:00:00.000Z',
    )
    expect(toZonedDateTimeIso('2026-01-12T17:00')).toBe(
      '2026-01-12T16:00:00.000Z',
    )
  })

  it('maps backend instants back to datetime-local values', () => {
    expect(toLocalDateTimeInputValue('2026-08-12T15:00:00Z')).toBe(
      '2026-08-12T17:00',
    )
  })

  it('rejects nonexistent daylight-saving wall-clock values', () => {
    expect(isValidLocalDateTime('2026-03-29T02:30')).toBe(false)
  })
})
