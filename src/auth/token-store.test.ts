import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createTokenStore,
  REFRESH_TOKEN_STORAGE_KEY,
  type TokenSnapshot,
} from '@/auth/token-store'

const stores: ReturnType<typeof createTokenStore>[] = []

afterEach(() => {
  for (const store of stores) {
    store.destroy()
  }

  stores.length = 0
})

describe('TokenStore', () => {
  it('keeps the access token in memory and stores the refresh session per tab by default', () => {
    const sessionStorage = new MemoryStorage()
    const localStorage = new MemoryStorage()
    const store = createStore({ localStorage, sessionStorage })

    store.setTokens({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })

    expect(store.getSnapshot()).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshTokenPersistence: 'session',
      sessionId: 'session-id',
    })
    expect(readStoredSession(sessionStorage)).toEqual({
      refreshToken: 'refresh-token',
      sessionId: 'session-id',
      version: 1,
    })
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('stores a persistent refresh session and removes a previous tab-local session', () => {
    const sessionStorage = new MemoryStorage()
    const localStorage = new MemoryStorage()
    const sessionIds = ['first-session', 'second-session']
    const store = createStore({
      createSessionId: () => sessionIds.shift() ?? 'fallback-session',
      localStorage,
      sessionStorage,
    })

    store.setTokens(
      {
        accessToken: 'first-access-token',
        refreshToken: 'session-refresh-token',
      },
      'session',
    )
    store.setTokens(
      {
        accessToken: 'second-access-token',
        refreshToken: 'persistent-refresh-token',
      },
      'persistent',
    )

    expect(store.getSnapshot()).toEqual({
      accessToken: 'second-access-token',
      refreshToken: 'persistent-refresh-token',
      refreshTokenPersistence: 'persistent',
      sessionId: 'second-session',
    })
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(readStoredSession(localStorage)).toMatchObject({
      refreshToken: 'persistent-refresh-token',
      sessionId: 'second-session',
    })
  })

  it('preserves a logical session ID when a refresh rotation supplies it', () => {
    const store = createStore({
      localStorage: new MemoryStorage(),
      sessionStorage: new MemoryStorage(),
    })

    store.setTokens(
      {
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
      },
      'persistent',
    )
    store.setTokens(
      {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
      'persistent',
      { sessionId: 'session-id' },
    )

    expect(store.getSnapshot()).toMatchObject({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      sessionId: 'session-id',
    })
  })

  it('keeps the current session when persistent storage is unavailable', () => {
    const sessionStorage = new MemoryStorage()
    const store = createStore({ sessionStorage })

    store.setTokens({
      accessToken: 'access-token',
      refreshToken: 'session-refresh-token',
    })

    expect(() =>
      store.setTokens(
        {
          accessToken: 'replacement-access-token',
          refreshToken: 'persistent-refresh-token',
        },
        'persistent',
      ),
    ).toThrow('persistent refresh-token storage is not available')
    expect(store.getSnapshot()).toEqual({
      accessToken: 'access-token',
      refreshToken: 'session-refresh-token',
      refreshTokenPersistence: 'session',
      sessionId: 'session-id',
    })
  })

  it('restores a legacy raw refresh token until the next rotation migrates it', () => {
    const sessionStorage = new MemoryStorage()
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'stored-refresh-token')

    const store = createStore({
      localStorage: new MemoryStorage(),
      sessionStorage,
    })

    expect(store.getSnapshot()).toEqual({
      accessToken: null,
      refreshToken: 'stored-refresh-token',
      refreshTokenPersistence: 'session',
      sessionId: expect.stringMatching(/^legacy-[a-f0-9]{16}$/),
    })
  })

  it('clears the in-memory access token and both refresh-session locations', () => {
    const sessionStorage = new MemoryStorage()
    const localStorage = new MemoryStorage()
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'stale-local-token')
    const store = createStore({ localStorage, sessionStorage })

    store.setTokens({
      accessToken: 'access-token',
      refreshToken: 'session-refresh-token',
    })
    store.clear()

    expect(store.getSnapshot()).toEqual({
      accessToken: null,
      refreshToken: null,
      refreshTokenPersistence: null,
      sessionId: null,
    })
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('publishes stable snapshots only when token state changes', () => {
    const store = createStore({
      localStorage: new MemoryStorage(),
      sessionStorage: new MemoryStorage(),
    })
    const snapshots: TokenSnapshot[] = []
    const listener = vi.fn((snapshot: TokenSnapshot) => {
      snapshots.push(snapshot)
    })

    const unsubscribe = store.subscribe(listener)

    store.setAccessToken('access-token')
    store.setAccessToken('access-token')
    unsubscribe()
    store.setAccessToken(null)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(snapshots).toEqual([
      {
        accessToken: 'access-token',
        refreshToken: null,
        refreshTokenPersistence: null,
        sessionId: null,
      },
    ])
  })

  it('keeps the current account during another tab rotation of the same session', () => {
    const eventTarget = new EventTarget()
    const localStorage = new MemoryStorage()
    const store = createStore({
      eventTarget,
      localStorage,
      sessionStorage: new MemoryStorage(),
    })

    store.setTokens(
      {
        accessToken: 'access-token',
        refreshToken: 'old-refresh-token',
      },
      'persistent',
    )

    writeStoredSession(localStorage, 'rotated-refresh-token', 'session-id')
    dispatchStorageEvent(eventTarget, localStorage)

    expect(store.getSnapshot()).toEqual({
      accessToken: 'access-token',
      refreshToken: 'rotated-refresh-token',
      refreshTokenPersistence: 'persistent',
      sessionId: 'session-id',
    })
  })

  it('re-reads a rotated persistent session even before a storage event arrives', () => {
    const localStorage = new MemoryStorage()
    const store = createStore({
      localStorage,
      sessionStorage: new MemoryStorage(),
    })

    store.setTokens(
      {
        accessToken: 'access-token',
        refreshToken: 'old-refresh-token',
      },
      'persistent',
    )
    writeStoredSession(localStorage, 'rotated-refresh-token', 'session-id')

    expect(store.synchronizePersistentSession()).toEqual({
      accessToken: 'access-token',
      refreshToken: 'rotated-refresh-token',
      refreshTokenPersistence: 'persistent',
      sessionId: 'session-id',
    })
  })

  it('drops the access token when another tab replaces the persistent account', () => {
    const eventTarget = new EventTarget()
    const localStorage = new MemoryStorage()
    const store = createStore({
      eventTarget,
      localStorage,
      sessionStorage: new MemoryStorage(),
    })

    store.setTokens(
      {
        accessToken: 'access-token',
        refreshToken: 'old-refresh-token',
      },
      'persistent',
    )

    writeStoredSession(localStorage, 'other-refresh-token', 'other-session')
    dispatchStorageEvent(eventTarget, localStorage)

    expect(store.getSnapshot()).toEqual({
      accessToken: null,
      refreshToken: 'other-refresh-token',
      refreshTokenPersistence: 'persistent',
      sessionId: 'other-session',
    })
  })

  it('does not replace an independent session token after a localStorage event', () => {
    const eventTarget = new EventTarget()
    const localStorage = new MemoryStorage()
    const sessionStorage = new MemoryStorage()
    const store = createStore({ eventTarget, localStorage, sessionStorage })

    store.setTokens({
      accessToken: 'access-token',
      refreshToken: 'session-refresh-token',
    })
    writeStoredSession(localStorage, 'other-tab-token', 'other-session')
    dispatchStorageEvent(eventTarget, localStorage)

    expect(store.getSnapshot()).toEqual({
      accessToken: 'access-token',
      refreshToken: 'session-refresh-token',
      refreshTokenPersistence: 'session',
      sessionId: 'session-id',
    })
  })
})

type CreateStoreOptions = {
  createSessionId?: () => string
  eventTarget?: EventTarget
  localStorage?: Storage
  sessionStorage?: Storage
}

function createStore(options: CreateStoreOptions) {
  const store = createTokenStore({
    createSessionId: options.createSessionId ?? (() => 'session-id'),
    ...options,
  })
  stores.push(store)
  return store
}

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

/** Reads the serialized refresh-session envelope from the test storage. */
function readStoredSession(storage: Storage): unknown {
  const value = storage.getItem(REFRESH_TOKEN_STORAGE_KEY)
  return value ? JSON.parse(value) : null
}

/** Replaces the shared persistent session for a simulated external tab. */
function writeStoredSession(
  storage: Storage,
  refreshToken: string,
  sessionId: string,
): void {
  storage.setItem(
    REFRESH_TOKEN_STORAGE_KEY,
    JSON.stringify({ refreshToken, sessionId, version: 1 }),
  )
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
