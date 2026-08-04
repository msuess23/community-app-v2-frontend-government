import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { appRoutes } from '@/app/router'
import { createQueryClient } from '@/app/query-client'
import type { AuthApi } from '@/auth/auth-api'
import { AuthSession } from '@/auth/auth-session'
import type { AuthUser, UpdateCurrentUserInput } from '@/auth/auth-types'
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

    expect(
      screen.getByRole('link', { name: 'Mein Konto', hidden: true }),
    ).toHaveAttribute('href', '/account')
    expect(
      screen.getByRole('link', { name: 'Benutzer', hidden: true }),
    ).toHaveAttribute('href', '/users')
    expect(
      screen.getByRole('link', { name: 'Mitteilungen', hidden: true }),
    ).toHaveAttribute('href', '/infos')

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

    fireEvent.click(closedMenuButton)
    fireEvent.pointerDown(
      screen.getByRole('heading', { level: 1, name: 'Übersicht' }),
    )
    expect(closedMenuButton).toHaveAttribute('aria-expanded', 'false')

    const accountSummary = screen
      .getByText('Kontomenü öffnen')
      .closest('summary')
    const accountMenu = accountSummary?.closest('details')
    expect(accountSummary).not.toBeNull()
    expect(accountMenu).not.toBeNull()

    fireEvent.click(accountSummary!)
    expect(accountMenu).toHaveAttribute('open')
    fireEvent.pointerDown(
      screen.getByRole('heading', { level: 1, name: 'Übersicht' }),
    )
    expect(accountMenu).not.toHaveAttribute('open')
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

  it('updates the authenticated profile from the account page', async () => {
    const user = userEvent.setup()
    const fixture = await createAuthFixture(ADMIN_USER)

    renderRouter(appRoutes, ['/account'], fixture)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mein Konto' }),
    ).toBeInTheDocument()

    const firstName = screen.getByRole('textbox', { name: 'Vorname' })
    const lastName = screen.getByRole('textbox', { name: 'Nachname' })
    await user.clear(firstName)
    await user.type(firstName, 'Augusta')
    await user.clear(lastName)
    await user.type(lastName, 'Lovelace')
    await user.click(
      screen.getByRole('button', { name: 'Änderungen speichern' }),
    )

    expect(fixture.api.updateCurrentUser).toHaveBeenCalledWith({
      firstName: 'Augusta',
      lastName: 'Lovelace',
    })
    expect(await screen.findByText('Profildaten gespeichert')).toBeVisible()
    expect(screen.getAllByText('Augusta Lovelace')).not.toHaveLength(0)
  })

  it('protects profile edits before ending the current session', async () => {
    const user = userEvent.setup()
    const fixture = await createAuthFixture(ADMIN_USER)
    renderRouter(appRoutes, ['/account'], fixture)

    await screen.findByRole('heading', { level: 1, name: 'Mein Konto' })
    const firstName = screen.getByRole('textbox', { name: 'Vorname' })
    await user.clear(firstName)
    await user.type(firstName, 'Augusta')
    await user.click(
      screen.getByRole('button', { name: 'Diese Sitzung abmelden' }),
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Trotz ungespeicherter Änderungen abmelden?',
    })
    await user.click(
      within(dialog).getByRole('button', { name: 'Weiter bearbeiten' }),
    )

    expect(fixture.api.logout).not.toHaveBeenCalled()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Mein Konto' }),
    ).toBeVisible()
    expect(firstName).toHaveValue('Augusta')
  })

  it('confirms and ends every account session from the account page', async () => {
    const user = userEvent.setup()
    const fixture = await createAuthFixture(ADMIN_USER)
    const rendered = renderRouter(appRoutes, ['/account'], fixture)

    await screen.findByRole('heading', { level: 1, name: 'Mein Konto' })
    await user.click(
      screen.getByRole('button', { name: 'Alle Sitzungen beenden' }),
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Alle Sitzungen wirklich beenden?',
    })
    await user.click(
      within(dialog).getByRole('button', { name: 'Alle Sitzungen beenden' }),
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Anmelden' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Sitzungen beendet')).toBeVisible()
    expect(rendered.router.state.location.pathname).toBe('/login')
  })

  it('warns when only the local session can be ended safely', async () => {
    const user = userEvent.setup()
    const fixture = await createAuthFixture(ADMIN_USER)
    vi.mocked(fixture.api.logoutAll).mockRejectedValueOnce(
      new Error('server unavailable'),
    )
    renderRouter(appRoutes, ['/account'], fixture)

    await screen.findByRole('heading', { level: 1, name: 'Mein Konto' })
    await user.click(
      screen.getByRole('button', { name: 'Alle Sitzungen beenden' }),
    )
    const dialog = screen.getByRole('dialog', {
      name: 'Alle Sitzungen wirklich beenden?',
    })
    await user.click(
      within(dialog).getByRole('button', { name: 'Alle Sitzungen beenden' }),
    )

    expect(
      await screen.findByText('Nur lokale Sitzung sicher beendet'),
    ).toBeVisible()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Anmelden' }),
    ).toBeInTheDocument()
  })

  it('preserves the requested account route after a session expires', async () => {
    const fixture = await createAuthFixture(ADMIN_USER)
    const rendered = renderRouter(appRoutes, ['/account'], fixture)

    await screen.findByRole('heading', { level: 1, name: 'Mein Konto' })
    act(() => {
      fixture.events.emit({
        reason: 'refresh-rejected',
        type: 'session-expired',
      })
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Anmelden' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Sitzung abgelaufen')).toBeVisible()
    expect(
      `${rendered.router.state.location.pathname}${rendered.router.state.location.search}`,
    ).toBe('/login?returnTo=%2Faccount')
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
  api: AuthApi
  authSession: AuthSession
  events: SessionEventBus
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
    updateCurrentUser: vi.fn(async (input: UpdateCurrentUserInput) => {
      currentUser = {
        ...currentUser,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
      }
      return currentUser
    }),
  }
  const events = new SessionEventBus()
  const authSession = new AuthSession({
    api,
    events,
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
    api,
    authSession,
    events,
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
