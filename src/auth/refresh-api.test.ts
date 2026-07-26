import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import type { ApiRequestExecutor } from '@/api/client/api-request'
import { requestTokenRefresh } from '@/auth/refresh-api'

describe('requestTokenRefresh', () => {
  it('uses the FastAPI refresh contract and maps the returned token pair', async () => {
    const request = vi.fn<ApiRequestExecutor>()
    request.mockResolvedValue({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      token_type: 'bearer',
    })

    await expect(
      requestTokenRefresh('current-refresh-token', request),
    ).resolves.toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    })
    expect(request).toHaveBeenCalledWith('/auth/refresh', {
      body: JSON.stringify({ refresh_token: 'current-refresh-token' }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      responseType: 'json',
    })
  })

  it('rejects an incomplete token response instead of storing it', async () => {
    const request = vi.fn<ApiRequestExecutor>()
    request.mockResolvedValue({
      access_token: 'new-access-token',
      refresh_token: null,
      token_type: 'bearer',
    })

    const error = await captureError(() =>
      requestTokenRefresh('current-refresh-token', request),
    )

    expect(error).toMatchObject({
      errorCode: 'INVALID_TOKEN_RESPONSE',
      status: 502,
    })
  })
})

async function captureError(action: () => Promise<unknown>): Promise<ApiError> {
  try {
    await action()
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    return error as ApiError
  }

  throw new Error('Expected an ApiError.')
}
