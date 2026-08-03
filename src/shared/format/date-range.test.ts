import { describe, expect, it } from 'vitest'

import { toZonedDayBoundaryIso } from '@/shared/format/date-range'

describe('toZonedDayBoundaryIso', () => {
  it('uses the Berlin winter offset for inclusive day boundaries', () => {
    expect(toZonedDayBoundaryIso('2026-01-15', 'start')).toBe(
      '2026-01-14T23:00:00.000Z',
    )
    expect(toZonedDayBoundaryIso('2026-01-15', 'end')).toBe(
      '2026-01-15T22:59:59.999Z',
    )
  })

  it('uses the Berlin summer offset and rejects invalid dates', () => {
    expect(toZonedDayBoundaryIso('2026-08-03', 'start')).toBe(
      '2026-08-02T22:00:00.000Z',
    )
    expect(() => toZonedDayBoundaryIso('2026-02-30', 'start')).toThrow(
      'Invalid ISO calendar date',
    )
  })
})
