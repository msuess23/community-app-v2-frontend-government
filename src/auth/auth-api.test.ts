import { describe, expect, it } from 'vitest'

import type { ApiFetch, ApiRequestOptions } from '@/api/client/api-fetch'
import { createAuthApi } from '@/auth/auth-api'

const USER_RESPONSE = {
  email: 'admin@test.com',
  first_name: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  last_name: 'Admin',
  office_id: null,
  role: 'ADMIN',
}

const CITIZEN_RESPONSE = {
  email: 'citizen@test.com',
  first_name: 'Carla',
  id: '00000000-0000-4000-8000-000000000002',
  last_name: 'Bürger',
  office_id: null,
  role: 'CITIZEN',
}

const TOKEN_RESPONSE = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  token_type: 'bearer',
}

describe('AuthApi', () => {
  it('submits login credentials as an unauthenticated OAuth2 form', async () => {
    const recorder = createRequestRecorder([TOKEN_RESPONSE])
    const api = createAuthApi(recorder.request)

    await expect(
      api.login({
        email: '  ADMIN@Test.COM ',
        password: 'secret-password',
        rememberMe: false,
      }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })

    expect(recorder.calls).toHaveLength(1)
    expect(recorder.calls[0]?.url).toBe('/auth/login')
    expect(recorder.calls[0]?.options.authentication).toBe('none')
    expect(recorder.calls[0]?.options.method).toBe('POST')
    expect(recorder.calls[0]?.options.body?.toString()).toBe(
      'username=admin%40test.com&password=secret-password',
    )
  })

  it('registers a normalized citizen account and parses the user response', async () => {
    const recorder = createRequestRecorder([CITIZEN_RESPONSE])
    const api = createAuthApi(recorder.request)

    await expect(
      api.register({
        email: '  Citizen@Test.COM ',
        firstName: '  Carla ',
        lastName: ' Bürger ',
        password: 'secret-password',
      }),
    ).resolves.toEqual({
      email: 'citizen@test.com',
      firstName: 'Carla',
      id: '00000000-0000-4000-8000-000000000002',
      lastName: 'Bürger',
      officeId: null,
      role: 'CITIZEN',
    })

    expect(JSON.parse(String(recorder.calls[0]?.options.body))).toEqual({
      email: 'citizen@test.com',
      first_name: 'Carla',
      last_name: 'Bürger',
      password: 'secret-password',
    })
    expect(recorder.calls[0]?.options.authentication).toBe('none')
  })

  it('loads the current user through the authenticated transport', async () => {
    const recorder = createRequestRecorder([USER_RESPONSE])
    const api = createAuthApi(recorder.request)

    await api.getCurrentUser()

    expect(recorder.calls).toEqual([
      {
        options: {},
        url: '/users/me',
      },
    ])
  })

  it('updates self-managed profile fields through the authenticated transport', async () => {
    const recorder = createRequestRecorder([
      {
        ...USER_RESPONSE,
        first_name: 'Augusta',
        last_name: 'Lovelace',
      },
    ])
    const api = createAuthApi(recorder.request)

    await expect(
      api.updateCurrentUser({
        firstName: '  Augusta ',
        lastName: ' Lovelace  ',
      }),
    ).resolves.toMatchObject({
      firstName: 'Augusta',
      lastName: 'Lovelace',
    })

    expect(recorder.calls[0]?.url).toBe('/users/me')
    expect(recorder.calls[0]?.options.method).toBe('PATCH')
    expect(JSON.parse(String(recorder.calls[0]?.options.body))).toEqual({
      first_name: 'Augusta',
      last_name: 'Lovelace',
    })
  })

  it('revokes one refresh token without an access token', async () => {
    const recorder = createRequestRecorder([undefined])
    const api = createAuthApi(recorder.request)

    await api.logout('refresh-token')

    expect(recorder.calls[0]?.url).toBe('/auth/logout')
    expect(recorder.calls[0]?.options.authentication).toBe('none')
    expect(JSON.parse(String(recorder.calls[0]?.options.body))).toEqual({
      refresh_token: 'refresh-token',
    })
  })

  it('revokes all sessions through an authenticated request', async () => {
    const recorder = createRequestRecorder([undefined])
    const api = createAuthApi(recorder.request)

    await api.logoutAll()

    expect(recorder.calls).toEqual([
      {
        options: { method: 'POST' },
        url: '/auth/logout-all',
      },
    ])
  })
})

type RecordedCall = Readonly<{
  options: ApiRequestOptions
  url: string
}>

function createRequestRecorder(responses: unknown[]): {
  calls: RecordedCall[]
  request: ApiFetch
} {
  const calls: RecordedCall[] = []
  let responseIndex = 0

  const request: ApiFetch = async <T>(
    url: string,
    options: ApiRequestOptions = {},
  ): Promise<T> => {
    calls.push({ options, url })
    return responses[responseIndex++] as T
  }

  return { calls, request }
}
