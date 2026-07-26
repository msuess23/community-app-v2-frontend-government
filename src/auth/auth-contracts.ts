import { z } from 'zod'

import { ApiError } from '@/api/client/api-error'
import type { AuthTokens } from '@/auth/token-store'

export type RefreshTokenRequest = {
  refresh_token: string
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.string().min(1),
})

export type TokenResponse = z.infer<typeof tokenResponseSchema>

export function parseTokenResponse(body: unknown): AuthTokens {
  const result = tokenResponseSchema.safeParse(body)

  if (!result.success) {
    throw new ApiError({
      body,
      errorCode: 'INVALID_TOKEN_RESPONSE',
      message: 'Die Token-Antwort des Servers ist ungültig.',
      status: 502,
      statusText: 'Invalid token response',
    })
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
  }
}
