import { isApiError } from '@/api/client/api-error'
import { throwIfRequestAborted } from '@/api/client/request-error'
import {
  executeApiRequest,
  type ApiRequestExecutor,
  type ApiRequestOptions as TransportRequestOptions,
  type ApiResponseType,
  type BodyType,
  type ErrorType,
} from '@/api/client/api-request'
import {
  refreshCoordinator,
  type RefreshCoordinator,
} from '@/auth/refresh-coordinator'
import { tokenStore, type TokenStore } from '@/auth/token-store'

export type ApiAuthenticationMode = 'auto' | 'none'

export type ApiRequestOptions = TransportRequestOptions & {
  authentication?: ApiAuthenticationMode
}

export type { ApiResponseType, BodyType, ErrorType }

export type ApiFetch = <T>(
  url: string,
  options?: ApiRequestOptions,
) => Promise<T>

type ApiFetchDependencies = {
  refresh?: Pick<RefreshCoordinator, 'refresh'>
  request?: ApiRequestExecutor
  tokens?: Pick<TokenStore, 'getAccessToken' | 'getRefreshToken'>
}

export function createApiFetch({
  refresh = refreshCoordinator,
  request = executeApiRequest,
  tokens = tokenStore,
}: ApiFetchDependencies = {}): ApiFetch {
  return async function authenticatedApiFetch<T>(
    url: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const { authentication = 'auto', ...requestOptions } = options
    const headers = new Headers(requestOptions.headers)
    const usesManagedAuthentication =
      authentication === 'auto' && !headers.has('Authorization')

    if (usesManagedAuthentication) {
      setBearerToken(headers, tokens.getAccessToken())
    }

    try {
      return (await request(url, {
        ...requestOptions,
        headers,
      })) as T
    } catch (error) {
      throwIfRequestAborted(requestOptions.signal)

      if (
        !shouldRefresh({
          error,
          requestOptions,
          tokens,
          usesManagedAuthentication,
        })
      ) {
        throw error
      }

      const refreshed = await refresh.refresh()
      throwIfRequestAborted(requestOptions.signal)

      const accessToken = tokens.getAccessToken()

      if (!refreshed || !accessToken) {
        throw error
      }

      const retryHeaders = new Headers(requestOptions.headers)
      setBearerToken(retryHeaders, accessToken)

      return (await request(url, {
        ...requestOptions,
        headers: retryHeaders,
      })) as T
    }
  }
}

export const apiFetch = createApiFetch()

function setBearerToken(headers: Headers, accessToken: string | null): void {
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
}

function shouldRefresh({
  error,
  requestOptions,
  tokens,
  usesManagedAuthentication,
}: {
  error: unknown
  requestOptions: TransportRequestOptions
  tokens: Pick<TokenStore, 'getRefreshToken'>
  usesManagedAuthentication: boolean
}): boolean {
  return (
    usesManagedAuthentication &&
    isApiError(error) &&
    error.status === 401 &&
    tokens.getRefreshToken() !== null &&
    isRetryableBody(requestOptions.body)
  )
}

function isRetryableBody(body: BodyInit | null | undefined): boolean {
  return !(
    typeof ReadableStream !== 'undefined' && body instanceof ReadableStream
  )
}
