import { describe, expect, it } from 'vitest'

import {
  normalizeTicketImageRemovalReason,
  ticketImageRemovalSchema,
} from '@/features/tickets/model/ticket-image-form'

describe('ticket image removal form', () => {
  it('normalizes an optional reason without inventing content', () => {
    expect(normalizeTicketImageRemovalReason('  Doppelte   Aufnahme  ')).toBe(
      'Doppelte Aufnahme',
    )
    expect(normalizeTicketImageRemovalReason('   ')).toBeNull()
  })

  it('limits the optional audit reason to 500 characters', () => {
    expect(
      ticketImageRemovalSchema.safeParse({ reason: 'x'.repeat(500) }).success,
    ).toBe(true)
    expect(
      ticketImageRemovalSchema.safeParse({ reason: 'x'.repeat(501) }).success,
    ).toBe(false)
  })
})
