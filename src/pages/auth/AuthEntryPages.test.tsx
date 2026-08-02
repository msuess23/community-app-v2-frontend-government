import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'

import {
  AuthContext,
  type AuthContextValue,
} from '@/auth/auth-context'
import { getSafeReturnTo } from '@/auth/auth-redirect'
import type { AuthUser } from '@/auth/auth-types'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'

const AUTHORITY_USER: AuthUser = {
  email: 'admin@test.com',
  firstName: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}

const CITIZEN_USER: AuthUser = {
  ...AUTHORITY_USER,
  email: 'citizen@test.com',
  role: 'CITIZEN',
}

describe('auth entry pages', () => {
  it('logs in and returns to a safe internal route', async () => {
    const user = userEvent.setup()
    const login = vi.fn(async () => AUTHORITY_USER)

    renderAuthRoutes('/login?returnTo=%2Ftickets%3Fpage%3D2', { login })

    await user.type(
      screen.getByRole('textbox', { name: 'E-Mail-Adresse' }),
      'admin@test.com',
    )
    await user.type(screen.getByLabelText(/^Passwort/), 'secret-password')
    await user.click(screen.getByRole('checkbox', { name: 'Angemeldet bleiben' }))
    await user.click(screen.getByRole('button', { name: 'Anmelden' }))

    expect(login).toHaveBeenCalledWith({
      email: 'admin@test.com',
      password: 'secret-password',
      rememberMe: true,
    })
    expect(
      await screen.findByRole('heading', { name: 'Ticketübersicht' }),
    ).toBeVisible()
  })

  it('routes a citizen account to the access-pending page', async () => {
    const user = userEvent.setup()

    renderAuthRoutes('/login', {
      login: vi.fn(async () => CITIZEN_USER),
    })

    await user.type(
      screen.getByRole('textbox', { name: 'E-Mail-Adresse' }),
      'citizen@test.com',
    )
    await user.type(screen.getByLabelText(/^Passwort/), 'secret-password')
    await user.click(screen.getByRole('button', { name: 'Anmelden' }))

    expect(
      await screen.findByRole('heading', { name: 'Zugang noch nicht freigeschaltet' }),
    ).toBeVisible()
  })

  it('registers a citizen account and returns to login', async () => {
    const user = userEvent.setup()
    const register = vi.fn(async () => CITIZEN_USER)

    renderAuthRoutes('/register', { register })

    await user.type(screen.getByRole('textbox', { name: 'Vorname' }), 'Cora')
    await user.type(
      screen.getByRole('textbox', { name: 'Nachname' }),
      'Citizen',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'E-Mail-Adresse' }),
      'citizen@test.com',
    )
    await user.type(screen.getByLabelText(/^Passwort(?! bestätigen)/), 'secret-password')
    await user.type(
      screen.getByLabelText(/^Passwort bestätigen/),
      'secret-password',
    )
    await user.click(screen.getByRole('button', { name: 'Konto erstellen' }))

    expect(register).toHaveBeenCalledWith({
      email: 'citizen@test.com',
      firstName: 'Cora',
      lastName: 'Citizen',
      password: 'secret-password',
    })
    expect(
      await screen.findByText(
        'Das Bürgerkonto wurde erstellt. Nach der Freischaltung durch die Administration kannst du den Behördenclient nutzen.',
      ),
    ).toBeVisible()
  })

  it('rejects external and authentication-entry return targets', () => {
    expect(getSafeReturnTo('https://example.com')).toBe('/')
    expect(getSafeReturnTo('//example.com')).toBe('/')
    expect(getSafeReturnTo('/login')).toBe('/')
    expect(getSafeReturnTo('/access-pending')).toBe('/')
    expect(getSafeReturnTo('/infos?status=ACTIVE#result')).toBe(
      '/infos?status=ACTIVE#result',
    )
  })
})

type AuthOverrides = Partial<
  Pick<AuthContextValue, 'login' | 'register'>
>

function renderAuthRoutes(initialEntry: string, overrides: AuthOverrides = {}) {
  const authValue: AuthContextValue = {
    isAuthenticated: false,
    isInitializing: false,
    login: overrides.login ?? vi.fn(async () => AUTHORITY_USER),
    logout: vi.fn(async () => undefined),
    logoutAll: vi.fn(async () => undefined),
    refreshCurrentUser: vi.fn(async () => AUTHORITY_USER),
    register: overrides.register ?? vi.fn(async () => CITIZEN_USER),
    state: {
      status: 'anonymous',
      user: null,
    },
    user: null,
  }
  const router = createMemoryRouter(
    [
      { path: '/login', Component: LoginPage },
      { path: '/register', Component: RegisterPage },
      {
        path: '/tickets',
        element: <h1>Ticketübersicht</h1>,
      },
      {
        path: '/access-pending',
        element: <h1>Zugang noch nicht freigeschaltet</h1>,
      },
    ],
    { initialEntries: [initialEntry] },
  )

  return render(
    <AuthContext.Provider value={authValue}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  )
}
