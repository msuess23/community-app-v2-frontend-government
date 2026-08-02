import type { ApiFetch } from '@/api/client/api-fetch'
import { apiFetch } from '@/api/client/api-fetch'
import {
  parseAuthUser,
  parseTokenResponse,
  type RegisterRequest,
} from '@/auth/auth-contracts'
import type {
  AuthUser,
  LoginInput,
  RegisterInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  UpdateCurrentUserInput,
} from '@/auth/auth-types'
import type { AuthTokens } from '@/auth/token-store'

export type AuthApi = Readonly<{
  getCurrentUser: () => Promise<AuthUser>
  login: (input: LoginInput) => Promise<AuthTokens>
  logout: (refreshToken: string) => Promise<void>
  logoutAll: () => Promise<void>
  register: (input: RegisterInput) => Promise<AuthUser>
  updateCurrentUser: (input: UpdateCurrentUserInput) => Promise<AuthUser>
}>

export function createAuthApi(request: ApiFetch = apiFetch): AuthApi {
  return {
    async getCurrentUser(): Promise<AuthUser> {
      return parseAuthUser(await request<unknown>('/users/me'))
    },

    async login(input: LoginInput): Promise<AuthTokens> {
      const form = new URLSearchParams({
        username: normalizeEmail(input.email),
        password: input.password,
      })
      const response = await request<unknown>('/auth/login', {
        authentication: 'none',
        body: form,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      })

      return parseTokenResponse(response)
    },

    async logout(refreshToken: string): Promise<void> {
      await request('/auth/logout', {
        authentication: 'none',
        body: JSON.stringify({ refresh_token: refreshToken }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
    },

    async logoutAll(): Promise<void> {
      await request('/auth/logout-all', {
        method: 'POST',
      })
    },

    async register(input: RegisterInput): Promise<AuthUser> {
      const body: RegisterRequest = {
        email: normalizeEmail(input.email),
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        password: input.password,
      }
      const response = await request<unknown>('/auth/register', {
        authentication: 'none',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      return parseAuthUser(response)
    },

    /** Updates profile fields owned by the authenticated account. */
    async updateCurrentUser(input: UpdateCurrentUserInput): Promise<AuthUser> {
      const response = await request<unknown>('/users/me', {
        body: JSON.stringify({
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      })

      return parseAuthUser(response)
    },
  }
}

export type PasswordRecoveryApi = Readonly<{
  requestPasswordReset: (input: RequestPasswordResetInput) => Promise<void>
  resetPassword: (input: ResetPasswordInput) => Promise<void>
}>

export function createPasswordRecoveryApi(
  request: ApiFetch = apiFetch,
): PasswordRecoveryApi {
  return {
    async requestPasswordReset(
      input: RequestPasswordResetInput,
    ): Promise<void> {
      await request('/auth/forgot-password-request', {
        authentication: 'none',
        body: JSON.stringify({ email: normalizeEmail(input.email) }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
    },

    async resetPassword(input: ResetPasswordInput): Promise<void> {
      await request('/auth/reset-password', {
        authentication: 'none',
        body: JSON.stringify({
          email: normalizeEmail(input.email),
          new_password: input.newPassword,
          otp: input.otp.trim(),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
    },
  }
}

export const passwordRecoveryApi = createPasswordRecoveryApi()

export const authApi = createAuthApi()

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
