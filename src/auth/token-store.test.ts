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
  it('keeps the access token in memory and stores the refresh token per tab by default', () => {
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
    })
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe(
      'refresh-token',
    )
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('stores a persistent refresh token in localStorage and removes a previous session token', () => {
    const sessionStorage = new MemoryStorage()
    const localStorage = new MemoryStorage()
    const store = createStore({ localStorage, sessionStorage })

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
    })
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe(
      'persistent-refresh-token',
    )
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
    })
  })

  it('restores only the refresh token when a store is created', () => {
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
    })
  })

  it('clears the in-memory access token and both refresh-token locations', () => {
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
      },
    ])
  })

  it('drops an access token when the shared persistent refresh token changes in another tab', () => {
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

    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'rotated-refresh-token')
    dispatchStorageEvent(eventTarget, localStorage)

    expect(store.getSnapshot()).toEqual({
      accessToken: null,
      refreshToken: 'rotated-refresh-token',
      refreshTokenPersistence: 'persistent',
    })
  })

  it('does not replace an independent session token after a localStorage event', () => {
    const eventTarget = new EventTarget()
    const localStorage = new MemoryStorage()
    const sessionStorage = new MemoryStorage()
    const store = createStore({
      eventTarget,
      localStorage,
      sessionStorage,
    })

    store.setTokens({
      accessToken: 'access-token',
      refreshToken: 'session-refresh-token',
    })
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'other-tab-token')
    dispatchStorageEvent(eventTarget, localStorage)

    expect(store.getSnapshot()).toEqual({
      accessToken: 'access-token',
      refreshToken: 'session-refresh-token',
      refreshTokenPersistence: 'session',
    })
  })
})

type CreateStoreOptions = {
  eventTarget?: EventTarget
  localStorage?: Storage
  sessionStorage?: Storage
}

function createStore(options: CreateStoreOptions) {
  const store = createTokenStore(options)
  stores.push(store)
  return store
}

function dispatchStorageEvent(
  eventTarget: EventTarget,
  storageArea: Storage,
): void {
  const event = new Event('storage')

  Object.defineProperties(event, {
    key: {
      value: REFRESH_TOKEN_STORAGE_KEY,
    },
    storageArea: {
      value: storageArea,
    },
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
