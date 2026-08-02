import { describe, expect, it } from 'vitest'

import { isAbortError, throwIfRequestAborted } from '@/api/client/request-error'

describe('isAbortError', () => {
  it('recognizes DOM and compatible abort failures', () => {
    expect(isAbortError(new DOMException('Aborted', 'AbortError'))).toBe(true)
    expect(isAbortError({ name: 'AbortError' })).toBe(true)
  })

  it('does not classify regular request failures as aborts', () => {
    expect(isAbortError(new Error('Request failed'))).toBe(false)
    expect(isAbortError(null)).toBe(false)
  })
})

describe('throwIfRequestAborted', () => {
  it('throws the signal reason after cancellation', () => {
    const controller = new AbortController()
    const reason = new DOMException('Cancelled', 'AbortError')
    controller.abort(reason)

    let thrown: unknown

    try {
      throwIfRequestAborted(controller.signal)
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBe(reason)
  })

  it('does nothing while the request remains active', () => {
    expect(() =>
      throwIfRequestAborted(new AbortController().signal),
    ).not.toThrow()
    expect(() => throwIfRequestAborted(undefined)).not.toThrow()
  })
})
