import { describe, expect, it, vi } from 'vitest'

import { SessionEventBus } from '@/auth/session-events'

describe('SessionEventBus', () => {
  it('publishes session events and supports unsubscribing', () => {
    const events = new SessionEventBus()
    const listener = vi.fn()
    const unsubscribe = events.subscribe(listener)

    events.emit({ reason: 'refresh-rejected', type: 'session-expired' })
    unsubscribe()
    events.emit({ reason: 'refresh-rejected', type: 'session-expired' })

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith({
      reason: 'refresh-rejected',
      type: 'session-expired',
    })
  })
})
