import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import {
  RefreshCoordinator,
  type TokenRefreshFunction,
} from '@/auth/refresh-coordinator'
import {
  AUTH_REFRESH_LOCK_NAME,
  createRefreshLock,
  type RefreshLock,
} from '@/auth/refresh-lock'
import { SessionEventBus } from '@/auth/session-events'
import { createTokenStore, type TokenStore } from '@/auth/token-store'

describe('RefreshCoordinator', () => {
  it('returns false without calling the API when no refresh session exists', async () => {
    const refreshTokens = vi.fn<TokenRefreshFunction>()
    const coordinator = createCoordinator({ refreshTokens })

    await expect(coordinator.refresh()).resolves.toBe(false)
    expect(refreshTokens).not.toHaveBeenCalled()
  })

  it('rotates a token and preserves its storage strategy', async () => {
    const store = createStore()
    store.setTokens(
      {
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
      },
      'persistent',
    )
    const refreshTokens = vi.fn<TokenRefreshFunction>().mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    })
    const coordinator = createCoordinator({ refreshTokens, store })

    await expect(coordinator.refresh()).resolves.toBe(true)
    expect(refreshTokens).toHaveBeenCalledWith('old-refresh-token')
    expect(store.getSnapshot()).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      refreshTokenPersistence: 'persistent',
    })
  })

  it('shares one rotation between concurrent requests in the same tab', async () => {
    const store = createStoreWithSession()
    const deferred = createDeferred<{
      accessToken: string
      refreshToken: string
    }>()
    const refreshTokens = vi
      .fn<TokenRefreshFunction>()
      .mockReturnValue(deferred.promise)
    const coordinator = createCoordinator({ refreshTokens, store })

    const first = coordinator.refresh()
    const second = coordinator.refresh()

    expect(first).toBe(second)
    expect(refreshTokens).toHaveBeenCalledOnce()

    deferred.resolve({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    })

    await expect(Promise.all([first, second])).resolves.toEqual([true, true])
  })

  it('clears a rejected refresh session and publishes an expiration event', async () => {
    const store = createStoreWithSession()
    const events = new SessionEventBus()
    const listener = vi.fn()
    events.subscribe(listener)
    const refreshTokens = vi.fn<TokenRefreshFunction>().mockRejectedValue(
      new ApiError({
        message: 'Refresh token rejected.',
        status: 401,
      }),
    )
    const coordinator = createCoordinator({ events, refreshTokens, store })

    await expect(coordinator.refresh()).rejects.toMatchObject({ status: 401 })
    expect(store.getSnapshot()).toEqual({
      accessToken: null,
      refreshToken: null,
      refreshTokenPersistence: null,
    })
    expect(listener).toHaveBeenCalledWith({
      reason: 'refresh-rejected',
      type: 'session-expired',
    })
  })

  it('keeps the stored session after a temporary network failure', async () => {
    const store = createStoreWithSession()
    const refreshTokens = vi.fn<TokenRefreshFunction>().mockRejectedValue(
      new ApiError({
        errorCode: 'NETWORK_ERROR',
        message: 'Network unavailable.',
        status: 0,
      }),
    )
    const coordinator = createCoordinator({ refreshTokens, store })

    await expect(coordinator.refresh()).rejects.toMatchObject({ status: 0 })
    expect(store.getSnapshot()).toEqual({
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
      refreshTokenPersistence: 'session',
    })
  })

  it('does not restore tokens when the session was cleared during rotation', async () => {
    const store = createStoreWithSession()
    const deferred = createDeferred<{
      accessToken: string
      refreshToken: string
    }>()
    const coordinator = createCoordinator({
      refreshTokens: () => deferred.promise,
      store,
    })

    const refresh = coordinator.refresh()
    store.clear()
    deferred.resolve({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    })

    await expect(refresh).resolves.toBe(false)
    expect(store.getSnapshot()).toEqual({
      accessToken: null,
      refreshToken: null,
      refreshTokenPersistence: null,
    })
  })

  it('uses the shared browser lock when it is available', async () => {
    const requestSpy = vi.fn<(name: string) => void>()
    const lock = createRefreshLock({
      request: async <Result>(
        name: string,
        task: () => Promise<Result>,
      ): Promise<Result> => {
        requestSpy(name)
        return task()
      },
    })

    await expect(lock.runExclusive(async () => 'result')).resolves.toBe(
      'result',
    )
    expect(requestSpy).toHaveBeenCalledWith(AUTH_REFRESH_LOCK_NAME)
  })
})

type CoordinatorOverrides = {
  events?: SessionEventBus
  lock?: RefreshLock
  refreshTokens?: TokenRefreshFunction
  store?: TokenStore
}

function createCoordinator(overrides: CoordinatorOverrides = {}) {
  return new RefreshCoordinator({
    events: overrides.events ?? new SessionEventBus(),
    lock:
      overrides.lock ??
      createRefreshLock(null),
    refreshTokens:
      overrides.refreshTokens ??
      vi.fn<TokenRefreshFunction>().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }),
    store: overrides.store ?? createStore(),
  })
}

function createStore(): TokenStore {
  return createTokenStore({
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
  })
}

function createStoreWithSession(): TokenStore {
  const store = createStore()
  store.setTokens({
    accessToken: 'old-access-token',
    refreshToken: 'old-refresh-token',
  })
  return store
}

function createDeferred<Value>() {
  let resolve!: (value: Value) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
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
