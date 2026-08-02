import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { mockApiError } from '@/test/http'
import { mockApiServer } from '@/test/server'

describe('mockApiServer', () => {
  it('intercepts successful API responses', async () => {
    mockApiServer.use(
      http.get('http://localhost/api/v1/test/items', () =>
        HttpResponse.json({ items: ['item-1'] }),
      ),
    )

    const response = await fetch('http://localhost/api/v1/test/items')

    await expect(response.json()).resolves.toEqual({ items: ['item-1'] })
  })

  it('creates the project error envelope for failure scenarios', async () => {
    mockApiServer.use(
      http.get('http://localhost/api/v1/test/items', () =>
        mockApiError({
          errorCode: 'RESOURCE_CONFLICT',
          message: 'The resource changed.',
          status: 409,
        }),
      ),
    )

    const response = await fetch('http://localhost/api/v1/test/items')

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      details: [],
      error_code: 'RESOURCE_CONFLICT',
      message: 'The resource changed.',
    })
  })
})
