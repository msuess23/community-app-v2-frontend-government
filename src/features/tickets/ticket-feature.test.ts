import { describe, expect, it } from 'vitest'

import { ticketFeature } from '@/features/tickets/ticket-feature'

describe('ticketFeature', () => {
  it('registers the readable ticket workspace routes', () => {
    expect(ticketFeature.capability).toBe('viewTicketWorkspace')
    expect(ticketFeature.navigation).toEqual([
      expect.objectContaining({ label: 'Tickets', to: '/tickets' }),
    ])
    expect(ticketFeature.routes.map((route) => route.path)).toEqual([
      'tickets',
      'tickets/:ticketId',
    ])
  })
})
