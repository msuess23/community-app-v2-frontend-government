import { describe, expect, it } from 'vitest'

import {
  changeReasonSchema,
  normalizeChangeReason,
} from '@/shared/forms/change-reason'

describe('changeReasonSchema', () => {
  it('matches the backend length contract', () => {
    expect(changeReasonSchema.safeParse('  Neue Zuständigkeit  ').success).toBe(
      true,
    )
    expect(changeReasonSchema.safeParse('  ').success).toBe(false)
    expect(changeReasonSchema.safeParse('x'.repeat(501)).success).toBe(false)
  })

  it('normalizes whitespace for audit history display', () => {
    expect(normalizeChangeReason('  Neue\n  Zuständigkeit ')).toBe(
      'Neue Zuständigkeit',
    )
  })
})
