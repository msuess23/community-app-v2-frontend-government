import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import type { AuthApi } from '@/auth/auth-api'
import { useAuth } from '@/auth/auth-context'
import { AuthSession } from '@/auth/auth-session'
import type { AuthUser } from '@/auth/auth-types'
import { SessionEventBus } from '@/auth/session-events'
import { createTokenStore } from '@/auth/token-store'
import { renderWithProviders } from '@/test/render'

const AUTH_USER: AuthUser = {
  email: 'admin@test.com',
  firstName: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}

describe('AuthProvider', () => {
  it('exposes login and the authenticated user through the context', async () => {
    const fixture = createFixture()
    const user = userEvent.setup()

    renderWithProviders(<AuthHarness />, {
      authSession: fixture.session,
      queryClient: fixture.queryClient,
    })

    expect(screen.getByText('anonymous')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Anmelden' }))

    expect(await screen.findByText('authenticated')).toBeVisible()
    expect(screen.getByText('admin@test.com')).toBeVisible()
  })

  it('announces a rejected refresh after clearing the authenticated session', async () => {
    const fixture = createFixture()
    const user = userEvent.setup()

    renderWithProviders(<AuthHarness />, {
      authSession: fixture.session,
      queryClient: fixture.queryClient,
    })

    await user.click(screen.getByRole('button', { name: 'Anmelden' }))
    await screen.findByText('authenticated')
    act(() => {
      fixture.events.emit({
        reason: 'refresh-rejected',
        type: 'session-expired',
      })
    })

    expect(await screen.findByText('Sitzung abgelaufen')).toBeVisible()
    expect(screen.getByText('anonymous')).toBeVisible()
  })

  it('announces a rejected refresh while a stored session is initializing', async () => {
    const fixture = createFixture({ storedRefreshToken: 'stored-refresh' })
    const refreshResult = deferred<boolean>()
    fixture.refresh.mockReturnValueOnce(refreshResult.promise)

    renderWithProviders(<AuthHarness />, {
      authSession: fixture.session,
      queryClient: fixture.queryClient,
    })

    expect(screen.getByText('initializing')).toBeVisible()
    act(() => {
      fixture.events.emit({
        reason: 'refresh-rejected',
        type: 'session-expired',
      })
    })

    expect(await screen.findByText('Sitzung abgelaufen')).toBeVisible()
    expect(screen.getByText('anonymous')).toBeVisible()
    refreshResult.resolve(false)
  })

  it('shows the initializing state while a stored session is restored', async () => {
    const fixture = createFixture({ storedRefreshToken: 'stored-refresh' })
    const refreshResult = deferred<boolean>()
    fixture.refresh.mockReturnValueOnce(refreshResult.promise)

    renderWithProviders(<AuthHarness />, {
      authSession: fixture.session,
      queryClient: fixture.queryClient,
    })

    expect(screen.getByText('initializing')).toBeVisible()

    fixture.store.setTokens({
      accessToken: 'restored-access',
      refreshToken: 'rotated-refresh',
    })
    refreshResult.resolve(true)

    expect(await screen.findByText('authenticated')).toBeVisible()
    expect(screen.getByText('admin@test.com')).toBeVisible()
  })
})

function AuthHarness() {
  const { login, state, user } = useAuth()

  return (
    <div>
      <span>{state.status}</span>
      <span>{user?.email ?? 'no-user'}</span>
      <button
        onClick={() =>
          void login({
            email: 'admin@test.com',
            password: 'secret-password',
            rememberMe: false,
          })
        }
        type="button"
      >
        Anmelden
      </button>
    </div>
  )
}

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
  const queryClient = createQueryClient()
  const api: AuthApi = {
    getCurrentUser: vi.fn(async () => AUTH_USER),
    login: vi.fn(async () => ({
      accessToken: 'login-access',
      refreshToken: 'login-refresh',
    })),
    logout: vi.fn(async () => undefined),
    logoutAll: vi.fn(async () => undefined),
    register: vi.fn(async () => AUTH_USER),
    updateCurrentUser: vi.fn(async () => AUTH_USER),
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
