import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { appRoutes } from '@/app/router'
import { createQueryClient } from '@/app/query-client'
import type { AuthApi } from '@/auth/auth-api'
import { AuthSession } from '@/auth/auth-session'
import type { AuthUser } from '@/auth/auth-types'
import { SessionEventBus } from '@/auth/session-events'
import { createTokenStore } from '@/auth/token-store'
import { renderRouter } from '@/test/render'

const ADMIN_USER: AuthUser = {
  email: 'admin@test.com',
  firstName: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}

const CITIZEN_USER: AuthUser = {
  ...ADMIN_USER,
  email: 'citizen@test.com',
  role: 'CITIZEN',
}

describe('application routes', () => {
  it('redirects an anonymous user to login and retains the target', async () => {
    const fixture = await createAuthFixture()

    const rendered = renderRouter(appRoutes, ['/?filter=open'], fixture)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Anmelden' }),
    ).toBeInTheDocument()
    expect(
      `${rendered.router.state.location.pathname}${rendered.router.state.location.search}`,
    ).toBe('/login?returnTo=%2F%3Ffilter%3Dopen')
  })

  it('renders the protected home page for an authority role', async () => {
    const fixture = await createAuthFixture(ADMIN_USER)

    renderRouter(appRoutes, ['/'], fixture)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Behördenclient' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Ada Admin')).toBeVisible()
  })

  it('redirects a citizen account to the forbidden page', async () => {
    const fixture = await createAuthFixture(CITIZEN_USER)

    renderRouter(appRoutes, ['/'], fixture)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Zugriff nicht erlaubt',
      }),
    ).toBeInTheDocument()
  })

  it('renders registration and the shared UI kit publicly', async () => {
    const fixture = await createAuthFixture()

    const registration = renderRouter(appRoutes, ['/register'], fixture)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Bürgerkonto erstellen',
      }),
    ).toBeInTheDocument()

    registration.unmount()
    renderRouter(appRoutes, ['/ui-kit'], await createAuthFixture())

    expect(
      await screen.findByRole('heading', { level: 1, name: 'UI-Bausteine' }),
    ).toBeInTheDocument()
  })

  it('renders the not-found page for an unknown path', async () => {
    renderRouter(appRoutes, ['/nicht-vorhanden'], await createAuthFixture())

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Seite nicht gefunden',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Zur Startseite' }),
    ).toHaveAttribute('href', '/')
  })
})

async function createAuthFixture(user?: AuthUser) {
  const queryClient = createQueryClient()
  const store = createTokenStore({
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
  })
  const api: AuthApi = {
    getCurrentUser: vi.fn(async () => user ?? ADMIN_USER),
    login: vi.fn(async () => ({
      accessToken: 'test-access',
      refreshToken: 'test-refresh',
    })),
    logout: vi.fn(async () => undefined),
    logoutAll: vi.fn(async () => undefined),
    register: vi.fn(async () => CITIZEN_USER),
  }
  const authSession = new AuthSession({
    api,
    events: new SessionEventBus(),
    queryClient,
    refresh: { refresh: vi.fn(async () => false) },
    store,
  })

  if (user) {
    await authSession.login({
      email: user.email,
      password: 'secret-password',
      rememberMe: false,
    })
  }

  return { authSession, queryClient }
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
