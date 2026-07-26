import {
  executeApiRequest,
  type ApiRequestExecutor,
} from '@/api/client/api-request'
import {
  parseTokenResponse,
  type RefreshTokenRequest,
  type TokenResponse,
} from '@/auth/auth-contracts'
import type { AuthTokens } from '@/auth/token-store'

export async function requestTokenRefresh(
  refreshToken: string,
  request: ApiRequestExecutor = executeApiRequest,
): Promise<AuthTokens> {
  const body: RefreshTokenRequest = {
    refresh_token: refreshToken,
  }
  const response = (await request('/auth/refresh', {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    responseType: 'json',
  })) as TokenResponse

  return parseTokenResponse(response)
}
