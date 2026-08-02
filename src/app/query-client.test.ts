import { describe, expect, it } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import { createQueryClient, shouldRetryQuery } from '@/app/query-client'

describe('shouldRetryQuery', () => {
  it('retries one network or transient server failure', () => {
    expect(
      shouldRetryQuery(
        0,
        new ApiError({
          errorCode: 'NETWORK_ERROR',
          message: 'Network unavailable',
          status: 0,
        }),
      ),
    ).toBe(true)
    expect(
      shouldRetryQuery(
        0,
        new ApiError({ message: 'Service unavailable', status: 503 }),
      ),
    ).toBe(true)
  })

  it('does not retry client, conflict or validation failures', () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429]) {
      expect(
        shouldRetryQuery(
          0,
          new ApiError({ message: 'Request failed', status }),
        ),
      ).toBe(false)
    }
  })

  it('does not retry aborted, unknown or already retried failures', () => {
    expect(shouldRetryQuery(0, new DOMException('Aborted', 'AbortError'))).toBe(
      false,
    )
    expect(shouldRetryQuery(0, new Error('Unexpected implementation error'))).toBe(
      false,
    )
    expect(
      shouldRetryQuery(
        1,
        new ApiError({ message: 'Gateway timeout', status: 504 }),
      ),
    ).toBe(false)
  })
})

describe('createQueryClient', () => {
  it('uses safe defaults for reads and never repeats mutations', () => {
    const client = createQueryClient()
    const defaults = client.getDefaultOptions()

    expect(defaults.queries).toMatchObject({
      gcTime: 300_000,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    })
    expect(defaults.queries?.retry).toBe(shouldRetryQuery)
    expect(defaults.mutations?.retry).toBe(false)
  })
})
