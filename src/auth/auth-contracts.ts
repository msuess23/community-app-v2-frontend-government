import { z } from 'zod'

import { ApiError } from '@/api/client/api-error'
import { ROLES, type AuthUser } from '@/auth/auth-types'
import type { AuthTokens } from '@/auth/token-store'

export type RefreshTokenRequest = {
  refresh_token: string
}

export type RegisterRequest = {
  email: string
  first_name: string
  last_name: string
  password: string
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.string().min(1),
})

const userResponseSchema = z.object({
  email: z.string().email(),
  first_name: z.string(),
  id: z.string().uuid(),
  last_name: z.string(),
  office_id: z.string().uuid().nullable().optional(),
  role: z.enum(ROLES),
})

export type TokenResponse = z.infer<typeof tokenResponseSchema>

export function parseTokenResponse(body: unknown): AuthTokens {
  const result = tokenResponseSchema.safeParse(body)

  if (!result.success) {
    throw invalidAuthResponse(body, 'INVALID_TOKEN_RESPONSE')
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
  }
}

export function parseAuthUser(body: unknown): AuthUser {
  const result = userResponseSchema.safeParse(body)

  if (!result.success) {
    throw invalidAuthResponse(body, 'INVALID_USER_RESPONSE')
  }

  return Object.freeze({
    email: result.data.email,
    firstName: result.data.first_name,
    id: result.data.id,
    lastName: result.data.last_name,
    officeId: result.data.office_id ?? null,
    role: result.data.role,
  })
}

function invalidAuthResponse(body: unknown, errorCode: string): ApiError {
  return new ApiError({
    body,
    errorCode,
    message: 'Die Authentifizierungsantwort des Servers ist ungültig.',
    status: 502,
    statusText: 'Invalid authentication response',
  })
}
