import { describe, expect, it } from 'vitest'

import type {
  ApiFetch,
  ApiRequestOptions,
} from '@/api/client/api-fetch'
import { createPasswordRecoveryApi } from '@/auth/auth-api'

describe('PasswordRecoveryApi', () => {
  it('requests a reset code without authentication and normalizes the email', async () => {
    const recorder = createRequestRecorder()
    const api = createPasswordRecoveryApi(recorder.request)

    await api.requestPasswordReset({ email: '  Citizen@Test.COM ' })

    expect(recorder.calls).toEqual([
      {
        options: {
          authentication: 'none',
          body: JSON.stringify({ email: 'citizen@test.com' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
        url: '/auth/forgot-password-request',
      },
    ])
  })

  it('submits the six-digit code and the backend new_password field', async () => {
    const recorder = createRequestRecorder()
    const api = createPasswordRecoveryApi(recorder.request)

    await api.resetPassword({
      email: ' Citizen@Test.COM ',
      newPassword: 'secret-password',
      otp: ' 123456 ',
    })

    expect(recorder.calls).toEqual([
      {
        options: {
          authentication: 'none',
          body: JSON.stringify({
            email: 'citizen@test.com',
            new_password: 'secret-password',
            otp: '123456',
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
        url: '/auth/reset-password',
      },
    ])
  })
})

type RecordedCall = Readonly<{
  options: ApiRequestOptions
  url: string
}>

function createRequestRecorder(): {
  calls: RecordedCall[]
  request: ApiFetch
} {
  const calls: RecordedCall[] = []
  const request: ApiFetch = async <T>(
    url: string,
    options: ApiRequestOptions = {},
  ): Promise<T> => {
    calls.push({ options, url })
    return undefined as T
  }

  return { calls, request }
}
