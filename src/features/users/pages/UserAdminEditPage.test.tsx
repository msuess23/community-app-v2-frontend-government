import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { UserAdminEditPage } from '@/features/users/pages/UserAdminEditPage'
import { ConfirmationProvider } from '@/shared/confirmation/ConfirmationProvider'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { mockApiServer } from '@/test/server'

const ADMIN_USER: AuthUser = {
  email: 'admin@example.test',
  firstName: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}

const TARGET_ID = '00000000-0000-4000-8000-000000000002'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'

describe('UserAdminEditPage', () => {
  it('promotes a citizen with an active office and preserves the list return target', async () => {
    const user = userEvent.setup()
    let requestBody: unknown

    mockApiServer.use(
      http.get(`http://localhost/api/v1/users/${TARGET_ID}`, () =>
        HttpResponse.json(userResponse({ role: 'CITIZEN' })),
      ),
      http.get('http://localhost/api/v1/offices', () =>
        HttpResponse.json({
          data: [
            {
              id: OFFICE_ID,
              metadata: {
                created_at: '2026-01-01T00:00:00Z',
                deactivated_at: null,
                is_active: true,
              },
              name: 'Ordnungsamt',
            },
          ],
          page: 1,
          pages: 1,
          size: 100,
          total: 1,
        }),
      ),
      http.patch(
        `http://localhost/api/v1/users/${TARGET_ID}`,
        async ({ request }) => {
          requestBody = await request.json()
          return HttpResponse.json(
            userResponse({ office_id: OFFICE_ID, role: 'OFFICER' }),
          )
        },
      ),
    )

    renderEditPage()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Clara Citizen' }),
    ).toBeInTheDocument()

    await user.selectOptions(
      screen.getByRole('combobox', { name: /Rolle/ }),
      'OFFICER',
    )
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: /Behörde/ }),
      ).toBeEnabled(),
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Behörde/ }),
      OFFICE_ID,
    )
    await user.type(
      screen.getByRole('textbox', { name: /Änderungsgrund/ }),
      'Freischaltung für die Sachbearbeitung',
    )
    await user.click(
      screen.getByRole('button', { name: 'Änderungen speichern' }),
    )

    expect(await screen.findByText('Benutzerprofil gespeichert')).toBeVisible()
    expect(requestBody).toEqual({
      change_reason: 'Freischaltung für die Sachbearbeitung',
      first_name: 'Clara',
      last_name: 'Citizen',
      office_id: OFFICE_ID,
      role: 'OFFICER',
    })
  })

  it('does not expose an editable form for a deactivated account', async () => {
    mockApiServer.use(
      http.get(`http://localhost/api/v1/users/${TARGET_ID}`, () =>
        HttpResponse.json(
          userResponse({
            metadata: {
              created_at: '2026-01-01T00:00:00Z',
              deactivated_at: '2026-08-01T00:00:00Z',
              is_active: false,
            },
          }),
        ),
      ),
    )

    renderEditPage()

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Bearbeitung nicht möglich',
      }),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Änderungen speichern' }),
    ).not.toBeInTheDocument()
  })
})

/** Renders the administrator route with the same global feedback and confirmation services as the app. */
function renderEditPage() {
  const authValue: AuthContextValue = {
    isAuthenticated: true,
    isInitializing: false,
    login: vi.fn(async () => ADMIN_USER),
    logout: vi.fn(async () => undefined),
    logoutAll: vi.fn(async () => undefined),
    refreshCurrentUser: vi.fn(async () => ADMIN_USER),
    register: vi.fn(async () => ADMIN_USER),
    state: { status: 'authenticated', user: ADMIN_USER },
    updateCurrentUser: vi.fn(async () => ADMIN_USER),
    user: ADMIN_USER,
  }

  const router = createMemoryRouter(
    [
      {
        element: <UserAdminEditPage />,
        path: 'users/:userId/edit',
      },
      {
        element: <p>Benutzerprofil gespeichert</p>,
        path: 'users/:userId',
      },
    ],
    {
      initialEntries: [
        {
          pathname: `/users/${TARGET_ID}/edit`,
          state: {
            from: `/users/${TARGET_ID}`,
            listFrom: '/users?role=CITIZEN',
          },
        },
      ],
    },
  )

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <FeedbackProvider>
        <ConfirmationProvider>
          <AuthContext.Provider value={authValue}>
            <RouterProvider router={router} />
          </AuthContext.Provider>
        </ConfirmationProvider>
      </FeedbackProvider>
    </QueryClientProvider>,
  )
}

/** Creates one backend-compatible user response with focused overrides. */
function userResponse(overrides: Record<string, unknown> = {}) {
  return {
    email: 'citizen@example.test',
    first_name: 'Clara',
    id: TARGET_ID,
    last_name: 'Citizen',
    metadata: {
      created_at: '2026-01-01T00:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    office_id: null,
    role: 'CITIZEN',
    ...overrides,
  }
}
