import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import {
  createApiFetch,
  type ApiRequestOptions,
} from '@/api/client/api-fetch'
import type { ApiRequestExecutor } from '@/api/client/api-request'

describe('apiFetch authentication', () => {
  it('adds the current access token to a managed request', async () => {
    const request = createRequestMock({ id: 'user-1' })
    const apiFetch = createApiFetch({
      request,
      tokens: createTokenReader('access-token', 'refresh-token'),
    })

    await apiFetch('/users/me')

    expect(readAuthorization(request, 0)).toBe('Bearer access-token')
  })

  it('does not replace an explicitly supplied authorization header', async () => {
    const request = createRequestMock({ ok: true })
    const refresh = { refresh: vi.fn() }
    const apiFetch = createApiFetch({
      refresh,
      request,
      tokens: createTokenReader('stored-access-token', 'refresh-token'),
    })

    await apiFetch('/external-resource', {
      headers: {
        Authorization: 'Custom credential',
      },
    })

    expect(readAuthorization(request, 0)).toBe('Custom credential')
    expect(refresh.refresh).not.toHaveBeenCalled()
  })

  it('supports public requests without adding or refreshing credentials', async () => {
    const request = vi.fn<ApiRequestExecutor>().mockRejectedValue(
      new ApiError({
        message: 'Unauthorized',
        status: 401,
      }),
    )
    const refresh = { refresh: vi.fn() }
    const apiFetch = createApiFetch({
      refresh,
      request,
      tokens: createTokenReader('access-token', 'refresh-token'),
    })

    await expect(
      apiFetch('/auth/login', { authentication: 'none' }),
    ).rejects.toMatchObject({ status: 401 })
    expect(readAuthorization(request, 0)).toBeNull()
    expect(refresh.refresh).not.toHaveBeenCalled()
  })

  it('refreshes after one unauthorized response and retries once', async () => {
    let accessToken = 'old-access-token'
    const request = vi
      .fn<ApiRequestExecutor>()
      .mockRejectedValueOnce(
        new ApiError({
          message: 'Unauthorized',
          status: 401,
        }),
      )
      .mockResolvedValueOnce({ id: 'user-1' })
    const refresh = {
      refresh: vi.fn(async () => {
        accessToken = 'new-access-token'
        return true
      }),
    }
    const apiFetch = createApiFetch({
      refresh,
      request,
      tokens: {
        getAccessToken: () => accessToken,
        getRefreshToken: () => 'refresh-token',
      },
    })

    await expect(apiFetch('/users/me')).resolves.toEqual({ id: 'user-1' })
    expect(refresh.refresh).toHaveBeenCalledOnce()
    expect(request).toHaveBeenCalledTimes(2)
    expect(readAuthorization(request, 0)).toBe('Bearer old-access-token')
    expect(readAuthorization(request, 1)).toBe('Bearer new-access-token')
  })

  it('does not retry a second unauthorized response', async () => {
    const unauthorized = new ApiError({
      message: 'Unauthorized',
      status: 401,
    })
    const request = vi
      .fn<ApiRequestExecutor>()
      .mockRejectedValueOnce(unauthorized)
      .mockRejectedValueOnce(unauthorized)
    const refresh = { refresh: vi.fn().mockResolvedValue(true) }
    const apiFetch = createApiFetch({
      refresh,
      request,
      tokens: createTokenReader('access-token', 'refresh-token'),
    })

    await expect(apiFetch('/users/me')).rejects.toBe(unauthorized)
    expect(request).toHaveBeenCalledTimes(2)
    expect(refresh.refresh).toHaveBeenCalledOnce()
  })

  it('does not refresh without a stored refresh token', async () => {
    const unauthorized = new ApiError({
      message: 'Unauthorized',
      status: 401,
    })
    const request = vi
      .fn<ApiRequestExecutor>()
      .mockRejectedValue(unauthorized)
    const refresh = { refresh: vi.fn() }
    const apiFetch = createApiFetch({
      refresh,
      request,
      tokens: createTokenReader('access-token', null),
    })

    await expect(apiFetch('/users/me')).rejects.toBe(unauthorized)
    expect(refresh.refresh).not.toHaveBeenCalled()
    expect(request).toHaveBeenCalledOnce()
  })
})

function createRequestMock(result: unknown) {
  return vi.fn<ApiRequestExecutor>().mockResolvedValue(result)
}

function createTokenReader(
  accessToken: string | null,
  refreshToken: string | null,
) {
  return {
    getAccessToken: () => accessToken,
    getRefreshToken: () => refreshToken,
  }
}

function readAuthorization(
  request: ReturnType<typeof vi.fn<ApiRequestExecutor>>,
  callIndex: number,
): string | null {
  const options = request.mock.calls[callIndex]?.[1] as
    | ApiRequestOptions
    | undefined

  return new Headers(options?.headers).get('Authorization')
}
