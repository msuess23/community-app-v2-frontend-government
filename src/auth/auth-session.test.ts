import { describe, expect, it, vi } from 'vitest'

import type { AuthApi } from '@/auth/auth-api'
import {
  AuthSession,
  type AuthStateListener,
} from '@/auth/auth-session'
import type {
  AuthUser,
  LoginInput,
  RegisterInput,
} from '@/auth/auth-types'
import { SessionEventBus } from '@/auth/session-events'
import { createTokenStore } from '@/auth/token-store'

const AUTH_USER: AuthUser = {
  email: 'admin@test.com',
  firstName: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}

const CITIZEN_USER: AuthUser = {
  email: 'citizen@test.com',
  firstName: 'Carla',
  id: '00000000-0000-4000-8000-000000000002',
  lastName: 'Bürger',
  officeId: null,
  role: 'CITIZEN',
}

describe('AuthSession', () => {
  it('starts anonymously when no refresh token exists', async () => {
    const fixture = createFixture()

    expect(fixture.session.getSnapshot()).toEqual({
      status: 'anonymous',
      user: null,
    })
    await expect(fixture.session.initialize()).resolves.toBeNull()
    expect(fixture.refresh).not.toHaveBeenCalled()
  })

  it('restores a stored session through refresh rotation and the current-user endpoint', async () => {
    const fixture = createFixture({ storedRefreshToken: 'stored-refresh' })
    fixture.refresh.mockImplementation(async () => {
      fixture.store.setTokens({
        accessToken: 'restored-access',
        refreshToken: 'rotated-refresh',
      })
      return true
    })

    expect(fixture.session.getSnapshot().status).toBe('initializing')
    await expect(fixture.session.initialize()).resolves.toEqual(AUTH_USER)
    expect(fixture.session.getSnapshot()).toEqual({
      status: 'authenticated',
      user: AUTH_USER,
    })
    expect(fixture.api.getCurrentUser).toHaveBeenCalledOnce()
  })

  it('logs in, keeps the selected persistence and clears previous query data', async () => {
    const fixture = createFixture()
    const listener: AuthStateListener = vi.fn()
    fixture.session.subscribe(listener)

    await expect(
      fixture.session.login({
        email: 'admin@test.com',
        password: 'secret-password',
        rememberMe: true,
      }),
    ).resolves.toEqual(AUTH_USER)

    expect(fixture.store.getSnapshot()).toEqual({
      accessToken: 'login-access',
      refreshToken: 'login-refresh',
      refreshTokenPersistence: 'persistent',
    })
    expect(fixture.queryClient.cancelQueries).toHaveBeenCalledOnce()
    expect(fixture.queryClient.clear).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledOnce()
    expect(fixture.session.getSnapshot().status).toBe('authenticated')
  })

  it('clears an incomplete login when loading the current user fails', async () => {
    const fixture = createFixture()
    vi.mocked(fixture.api.getCurrentUser).mockRejectedValueOnce(
      new Error('profile unavailable'),
    )

    await expect(
      fixture.session.login({
        email: 'admin@test.com',
        password: 'secret-password',
        rememberMe: false,
      }),
    ).rejects.toThrow('profile unavailable')

    expect(fixture.store.getSnapshot()).toEqual({
      accessToken: null,
      refreshToken: null,
      refreshTokenPersistence: null,
    })
    expect(fixture.session.getSnapshot().status).toBe('anonymous')
  })

  it('clears the browser session before waiting for the logout request', async () => {
    const logout = deferred<void>()
    const fixture = createFixture({ storedRefreshToken: 'stored-refresh' })
    vi.mocked(fixture.api.logout).mockReturnValueOnce(logout.promise)

    const result = fixture.session.logout()

    expect(fixture.store.getRefreshToken()).toBeNull()
    expect(fixture.session.getSnapshot().status).toBe('anonymous')
    expect(fixture.api.logout).toHaveBeenCalledWith('stored-refresh')

    logout.resolve(undefined)
    await result
  })

  it('always clears the local session after logout from all devices', async () => {
    const fixture = createFixture({ storedRefreshToken: 'stored-refresh' })
    fixture.store.setAccessToken('access-token')
    vi.mocked(fixture.api.logoutAll).mockRejectedValueOnce(
      new Error('server unavailable'),
    )

    await expect(fixture.session.logoutAll()).rejects.toThrow(
      'server unavailable',
    )
    expect(fixture.store.getRefreshToken()).toBeNull()
    expect(fixture.session.getSnapshot().status).toBe('anonymous')
  })

  it('reacts to a rejected refresh event and clears cached data', () => {
    const fixture = createFixture({ storedRefreshToken: 'stored-refresh' })
    fixture.store.setAccessToken('access-token')
    const stop = fixture.session.start()

    fixture.events.emit({
      reason: 'refresh-rejected',
      type: 'session-expired',
    })

    expect(fixture.store.getRefreshToken()).toBeNull()
    expect(fixture.queryClient.clear).toHaveBeenCalled()
    expect(fixture.session.getSnapshot().status).toBe('anonymous')
    stop()
  })

  it('registers a citizen without changing the current session', async () => {
    const fixture = createFixture()

    await expect(
      fixture.session.register({
        email: 'citizen@test.com',
        firstName: 'Carla',
        lastName: 'Bürger',
        password: 'secret-password',
      }),
    ).resolves.toEqual(CITIZEN_USER)
    expect(fixture.session.getSnapshot().status).toBe('anonymous')
  })
})

type FixtureOptions = Readonly<{
  storedRefreshToken?: string
}>

function createFixture(options: FixtureOptions = {}) {
  const sessionStorage = new MemoryStorage()
  const localStorage = new MemoryStorage()

  if (options.storedRefreshToken) {
    sessionStorage.setItem(
      'community-app-authority-client.refresh-token',
      options.storedRefreshToken,
    )
  }

  const store = createTokenStore({ localStorage, sessionStorage })
  const api: AuthApi = {
    getCurrentUser: vi.fn(async () => AUTH_USER),
    login: vi.fn(async (_input: LoginInput) => ({
      accessToken: 'login-access',
      refreshToken: 'login-refresh',
    })),
    logout: vi.fn(async (_refreshToken: string) => undefined),
    logoutAll: vi.fn(async () => undefined),
    register: vi.fn(async (_input: RegisterInput) => CITIZEN_USER),
  }
  const queryClient = {
    cancelQueries: vi.fn(async () => undefined),
    clear: vi.fn(),
  }
  const events = new SessionEventBus()
  const refresh = vi.fn(async () => false)
  const session = new AuthSession({
    api,
    events,
    queryClient,
    refresh: { refresh },
    store,
  })

  return {
    api,
    events,
    queryClient,
    refresh,
    session,
    store,
  }
}

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}
