import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'

import type { PasswordRecoveryApi } from '@/auth/auth-api'
import {
  AuthContext,
  type AuthContextValue,
} from '@/auth/auth-context'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'

const ANONYMOUS_AUTH: AuthContextValue = {
  isAuthenticated: false,
  isInitializing: false,
  login: vi.fn(async () => {
    throw new Error('Not used in this test.')
  }),
  logout: vi.fn(async () => undefined),
  logoutAll: vi.fn(async () => undefined),
  refreshCurrentUser: vi.fn(async () => {
    throw new Error('Not used in this test.')
  }),
  register: vi.fn(async () => {
    throw new Error('Not used in this test.')
  }),
  state: { status: 'anonymous', user: null },
  user: null,
}

describe('password recovery pages', () => {
  it('shows an enumeration-resistant result after requesting a code', async () => {
    const user = userEvent.setup()
    const api = createApi()

    renderRecoveryRoutes('/password-forgotten', api)

    await user.type(
      screen.getByRole('textbox', { name: 'E-Mail-Adresse' }),
      'Citizen@Test.COM',
    )
    await user.click(
      screen.getByRole('button', { name: 'Einmalcode anfordern' }),
    )

    expect(api.requestPasswordReset).toHaveBeenCalledWith({
      email: 'citizen@test.com',
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Wenn für diese E-Mail-Adresse ein aktives Konto besteht',
    )
    expect(
      screen.getByRole('link', { name: 'Einmalcode eingeben' }),
    ).toHaveAttribute(
      'href',
      '/password-reset?email=citizen%40test.com',
    )
  })

  it('resets the password and returns to login with a success marker', async () => {
    const user = userEvent.setup()
    const api = createApi()
    const router = renderRecoveryRoutes(
      '/password-reset?email=citizen%40test.com',
      api,
    )

    expect(screen.getByRole('textbox', { name: 'E-Mail-Adresse' })).toHaveValue(
      'citizen@test.com',
    )
    await user.type(screen.getByRole('textbox', { name: 'Einmalcode' }), '123456')
    await user.type(screen.getByLabelText(/^Neues Passwort$/), 'secret-password')
    await user.type(
      screen.getByLabelText('Neues Passwort bestätigen'),
      'secret-password',
    )
    await user.click(screen.getByRole('button', { name: 'Passwort ändern' }))

    expect(api.resetPassword).toHaveBeenCalledWith({
      email: 'citizen@test.com',
      newPassword: 'secret-password',
      otp: '123456',
    })
    expect(await screen.findByRole('heading', { name: 'Anmelden' })).toBeVisible()
    expect(
      screen.getByText(
        'Das Passwort wurde geändert. Du kannst dich jetzt anmelden.',
      ),
    ).toBeVisible()
    expect(router.state.location.search).toBe('?passwordReset=1')
  })
})

function createApi(): PasswordRecoveryApi {
  return {
    requestPasswordReset: vi.fn(async () => undefined),
    resetPassword: vi.fn(async () => undefined),
  }
}

function renderRecoveryRoutes(
  initialEntry: string,
  api: PasswordRecoveryApi,
) {
  const router = createMemoryRouter(
    [
      {
        path: '/password-forgotten',
        element: <ForgotPasswordPage api={api} />,
      },
      {
        path: '/password-reset',
        element: <ResetPasswordPage api={api} />,
      },
      { path: '/login', element: <LoginPage /> },
      {
        path: '/access-pending',
        element: <h1>Zugang noch nicht freigeschaltet</h1>,
      },
      { path: '/', element: <h1>Behördenclient</h1> },
    ],
    { initialEntries: [initialEntry] },
  )

  render(
    <AuthContext.Provider value={ANONYMOUS_AUTH}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  )

  return router
}
