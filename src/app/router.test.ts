import { act, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    expect(document.title).toBe('Anmelden · Community-App Behördenclient')
  })

  it('renders the responsive application shell for an authority role', async () => {
    const fixture = await createAuthFixture(ADMIN_USER)

    renderRouter(appRoutes, ['/'], fixture)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Übersicht' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Ada Admin')).not.toHaveLength(0)
    expect(screen.getAllByText('Administration')).not.toHaveLength(0)
    expect(
      screen.getByRole('navigation', { name: 'Hauptnavigation', hidden: true }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Übersicht', hidden: true }),
    ).toHaveAttribute('aria-current', 'page')

    const menuButton = screen.getByRole('button', {
      hidden: true,
      name: 'Hauptnavigation öffnen',
    })
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(menuButton)
    expect(
      screen.getByRole('button', {
        hidden: true,
        name: 'Hauptnavigation schließen',
      }),
    ).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(
      screen.getByRole('navigation', { name: 'Hauptnavigation', hidden: true }),
      { key: 'Escape' },
    )
    const closedMenuButton = screen.getByRole('button', {
      hidden: true,
      name: 'Hauptnavigation öffnen',
    })
    expect(closedMenuButton).toHaveAttribute('aria-expanded', 'false')
    expect(closedMenuButton).toHaveFocus()
  })

  it('lets a citizen recheck a newly assigned authority role', async () => {
    const user = userEvent.setup()
    const fixture = await createAuthFixture(CITIZEN_USER)

    renderRouter(appRoutes, ['/access-pending'], fixture)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Zugang noch nicht freigeschaltet',
      }),
    ).toBeInTheDocument()

    fixture.setCurrentUser(ADMIN_USER)
    await user.click(
      screen.getByRole('button', { name: 'Zugang erneut prüfen' }),
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Übersicht' }),
    ).toBeInTheDocument()
  })

  it('redirects a citizen away from the protected application shell', async () => {
    const fixture = await createAuthFixture(CITIZEN_USER)
    const rendered = renderRouter(appRoutes, ['/'], fixture)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Zugang noch nicht freigeschaltet',
      }),
    ).toBeInTheDocument()
    expect(rendered.router.state.location.pathname).toBe('/access-pending')
  })

  it('renders registration and the UI kit only as public development pages', async () => {
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

  it('renders authenticated errors inside the application shell', async () => {
    const rendered = renderRouter(
      appRoutes,
      ['/nicht-vorhanden'],
      await createAuthFixture(ADMIN_USER),
    )

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Seite nicht gefunden',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Zur Startseite' }),
    ).toHaveAttribute('href', '/')

    await act(async () => {
      await rendered.router.navigate('/forbidden')
    })

    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Zugriff nicht erlaubt',
    })
    expect(heading).toHaveFocus()
    expect(document.title).toBe(
      'Zugriff nicht erlaubt · Community-App Behördenclient',
    )
  })
})

type AuthFixture = Readonly<{
  authSession: AuthSession
  queryClient: ReturnType<typeof createQueryClient>
  setCurrentUser: (user: AuthUser) => void
}>

/**
 * Creates an isolated authenticated session whose current user can change in tests.
 */
async function createAuthFixture(user?: AuthUser): Promise<AuthFixture> {
  const queryClient = createQueryClient()
  const store = createTokenStore({
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
  })
  let currentUser = user ?? ADMIN_USER
  const api: AuthApi = {
    getCurrentUser: vi.fn(async () => currentUser),
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

  return {
    authSession,
    queryClient,
    setCurrentUser(nextUser) {
      currentUser = nextUser
    },
  }
}

/** Provides the browser storage contract without sharing state between tests. */
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
