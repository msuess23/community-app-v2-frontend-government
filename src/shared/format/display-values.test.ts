import { describe, expect, it } from 'vitest'

import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatDisplayFileSize,
  formatDisplayInteger,
} from '@/shared/format/display-values'

describe('display value formatters', () => {
  it('uses the German authority display timezone for timestamps', () => {
    expect(formatDisplayDateTime('2026-01-15T23:30:00Z')).toBe(
      '16.01.2026, 00:30',
    )
    expect(formatDisplayDate('2026-01-15T23:30:00Z')).toBe('16.01.2026')
  })

  it('formats selected file sizes for compact metadata', () => {
    expect(formatDisplayFileSize(0)).toBe('0 Byte')
    expect(formatDisplayFileSize(1536)).toBe('1,5 KB')
  })

  it('returns a neutral placeholder for invalid values', () => {
    expect(formatDisplayDateTime('not-a-date')).toBe('–')
    expect(formatDisplayInteger(Number.NaN)).toBe('–')
  })
})
