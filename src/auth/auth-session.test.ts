import { describe, expect, it, vi } from 'vitest'

import type { AuthApi } from '@/auth/auth-api'
import {
  AuthSession,
  type AuthStateListener,
} from '@/auth/auth-session'
import type { AuthUser } from '@/auth/auth-types'
import { SessionEventBus } from '@/auth/session-events'
import {
  createTokenStore,
  REFRESH_TOKEN_STORAGE_KEY,
} from '@/auth/token-store'

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
      sessionId: 'session-id',
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
      sessionId: null,
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

  it('reports a local-only result when revoking all sessions fails', async () => {
    const fixture = createFixture({ storedRefreshToken: 'stored-refresh' })
    fixture.store.setAccessToken('access-token')
    vi.mocked(fixture.api.logoutAll).mockRejectedValueOnce(
      new Error('server unavailable'),
    )

    await expect(fixture.session.logoutAll()).resolves.toBeUndefined()
    expect(fixture.store.getRefreshToken()).toBeNull()
    expect(fixture.session.getSnapshot().status).toBe('anonymous')
    expect(fixture.session.consumeEndReason()).toBe('logout-all-local-only')
    expect(fixture.session.consumeEndReason()).toBeNull()
  })

  it('reports successful revocation after logout from all devices', async () => {
    const fixture = createFixture({ storedRefreshToken: 'stored-refresh' })

    await fixture.session.logoutAll()

    expect(fixture.session.consumeEndReason()).toBe('logout-all-complete')
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
    expect(fixture.session.consumeEndReason()).toBe('refresh-rejected')
    stop()
  })

  it('keeps the authenticated user when another tab rotates the same persistent session', async () => {
    const fixture = createFixture()
    await fixture.session.login({
      email: 'admin@test.com',
      password: 'secret-password',
      rememberMe: true,
    })
    const cacheClearCount = fixture.queryClient.clear.mock.calls.length
    const stop = fixture.session.start()

    writePersistentSession(
      fixture.localStorage,
      'rotated-refresh-token',
      'session-id',
    )
    dispatchStorageEvent(fixture.eventTarget, fixture.localStorage)

    expect(fixture.session.getSnapshot()).toEqual({
      status: 'authenticated',
      user: AUTH_USER,
    })
    expect(fixture.refresh).not.toHaveBeenCalled()
    expect(fixture.queryClient.clear).toHaveBeenCalledTimes(cacheClearCount)
    stop()
  })

  it('ends the local session when another tab removes the persistent login', async () => {
    const fixture = createFixture()
    await fixture.session.login({
      email: 'admin@test.com',
      password: 'secret-password',
      rememberMe: true,
    })
    const cacheClearCount = fixture.queryClient.clear.mock.calls.length
    const stop = fixture.session.start()

    fixture.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    dispatchStorageEvent(fixture.eventTarget, fixture.localStorage)

    expect(fixture.session.getSnapshot()).toEqual({
      status: 'anonymous',
      user: null,
    })
    expect(fixture.session.consumeEndReason()).toBe(
      'session-ended-in-another-tab',
    )
    expect(fixture.queryClient.clear).toHaveBeenCalledTimes(cacheClearCount + 1)
    stop()
  })

  it('clears cached data and restores a replacement account from another tab', async () => {
    const fixture = createFixture()
    await fixture.session.login({
      email: 'admin@test.com',
      password: 'secret-password',
      rememberMe: true,
    })
    vi.mocked(fixture.api.getCurrentUser).mockResolvedValueOnce(CITIZEN_USER)
    fixture.refresh.mockImplementationOnce(async () => {
      fixture.store.setTokens(
        {
          accessToken: 'replacement-access-token',
          refreshToken: 'replacement-rotated-token',
        },
        'persistent',
        { sessionId: 'replacement-session' },
      )
      return true
    })
    const cacheClearCount = fixture.queryClient.clear.mock.calls.length
    const stop = fixture.session.start()

    writePersistentSession(
      fixture.localStorage,
      'replacement-refresh-token',
      'replacement-session',
    )
    dispatchStorageEvent(fixture.eventTarget, fixture.localStorage)

    expect(fixture.session.getSnapshot().status).toBe('initializing')
    await vi.waitFor(() => {
      expect(fixture.session.getSnapshot()).toEqual({
        status: 'authenticated',
        user: CITIZEN_USER,
      })
    })
    expect(fixture.queryClient.clear).toHaveBeenCalledTimes(cacheClearCount + 1)
    stop()
  })

  it('reloads the authenticated profile after an administrator changes the role', async () => {
    const fixture = createFixture()

    await fixture.session.login({
      email: 'admin@test.com',
      password: 'secret-password',
      rememberMe: false,
    })
    vi.mocked(fixture.api.getCurrentUser).mockResolvedValueOnce(CITIZEN_USER)

    await expect(fixture.session.refreshCurrentUser()).resolves.toEqual(
      CITIZEN_USER,
    )
    expect(fixture.session.getSnapshot()).toEqual({
      status: 'authenticated',
      user: CITIZEN_USER,
    })
  })

  it('updates the current profile and publishes the returned user snapshot', async () => {
    const fixture = createFixture()
    const updatedUser = {
      ...AUTH_USER,
      firstName: 'Augusta',
      lastName: 'Lovelace',
    }

    await fixture.session.login({
      email: 'admin@test.com',
      password: 'secret-password',
      rememberMe: false,
    })
    vi.mocked(fixture.api.updateCurrentUser).mockResolvedValueOnce(updatedUser)

    await expect(
      fixture.session.updateCurrentUser({
        firstName: 'Augusta',
        lastName: 'Lovelace',
      }),
    ).resolves.toEqual(updatedUser)
    expect(fixture.session.getSnapshot()).toEqual({
      status: 'authenticated',
      user: updatedUser,
    })
  })

  it('rejects profile reloads without an authenticated session', async () => {
    const fixture = createFixture()

    await expect(fixture.session.refreshCurrentUser()).rejects.toThrow(
      'without an active session',
    )
  })

  it('rejects profile updates without an authenticated session', async () => {
    const fixture = createFixture()

    await expect(
      fixture.session.updateCurrentUser({
        firstName: 'Ada',
        lastName: 'Admin',
      }),
    ).rejects.toThrow('without an active session')
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
  const eventTarget = new EventTarget()

  if (options.storedRefreshToken) {
    sessionStorage.setItem(
      'community-app-authority-client.refresh-token',
      options.storedRefreshToken,
    )
  }

  const store = createTokenStore({
    createSessionId: () => 'session-id',
    eventTarget,
    localStorage,
    sessionStorage,
  })
  const api: AuthApi = {
    getCurrentUser: vi.fn(async () => AUTH_USER),
    login: vi.fn(async () => ({
      accessToken: 'login-access',
      refreshToken: 'login-refresh',
    })),
    logout: vi.fn(async () => undefined),
    logoutAll: vi.fn(async () => undefined),
    register: vi.fn(async () => CITIZEN_USER),
    updateCurrentUser: vi.fn(async () => AUTH_USER),
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
    eventTarget,
    events,
    localStorage,
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

/** Writes the persistent refresh-session envelope used by another simulated tab. */
function writePersistentSession(
  storage: Storage,
  refreshToken: string,
  sessionId: string,
): void {
  storage.setItem(
    REFRESH_TOKEN_STORAGE_KEY,
    JSON.stringify({ refreshToken, sessionId, version: 1 }),
  )
}

/** Publishes a browser-like storage event to the active token store. */
function dispatchStorageEvent(
  eventTarget: EventTarget,
  storageArea: Storage,
): void {
  const event = new Event('storage')
  Object.defineProperties(event, {
    key: { value: REFRESH_TOKEN_STORAGE_KEY },
    storageArea: { value: storageArea },
  })
  eventTarget.dispatchEvent(event)
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
