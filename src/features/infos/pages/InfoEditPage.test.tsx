import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { InfoEditPage } from '@/features/infos/pages/InfoEditPage'
import { ConfirmationProvider } from '@/shared/confirmation/ConfirmationProvider'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { mockApiServer } from '@/test/server'

const INFO_ID = '00000000-0000-4000-8000-000000000100'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'
const OTHER_OFFICE_ID = '00000000-0000-4000-8000-000000000011'
const ADMIN: AuthUser = {
  email: 'admin@example.test',
  firstName: 'Ada',
  id: 'user-admin',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}

describe('InfoEditPage', () => {
  it('sends a minimal partial update and preserves hidden coordinates', async () => {
    const user = userEvent.setup()
    let requestBody: unknown

    mockApiServer.use(
      http.get(`http://localhost/api/v1/infos/${INFO_ID}`, () =>
        HttpResponse.json(infoResponse()),
      ),
      http.get('http://localhost/api/v1/offices', () =>
        HttpResponse.json({
          data: [officeResponse()],
          page: 1,
          pages: 1,
          size: 100,
          total: 1,
        }),
      ),
      http.put(
        `http://localhost/api/v1/infos/${INFO_ID}`,
        async ({ request }) => {
          requestBody = await request.json()
          return HttpResponse.json(
            infoResponse({
              address: { ...infoResponse().address, city: 'Markkleeberg' },
              description: 'Aktualisierte Beschreibung',
            }),
          )
        },
      ),
    )

    renderEditPage(ADMIN)

    const description = await screen.findByRole('textbox', {
      name: 'Beschreibung',
    })
    await user.clear(description)
    await user.type(description, 'Aktualisierte Beschreibung')
    const city = screen.getByRole('textbox', { name: /Ort/ })
    await user.clear(city)
    await user.type(city, 'Markkleeberg')
    await user.click(
      screen.getByRole('button', { name: 'Änderungen speichern' }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Mitteilungsdetails geöffnet',
      }),
    ).toBeVisible()
    expect(requestBody).toEqual({
      address: { city: 'Markkleeberg' },
      description: 'Aktualisierte Beschreibung',
    })
  })

  it('does not expose the form for another office to a case worker', async () => {
    const officer: AuthUser = {
      ...ADMIN,
      officeId: OTHER_OFFICE_ID,
      role: 'OFFICER',
    }

    mockApiServer.use(
      http.get(`http://localhost/api/v1/infos/${INFO_ID}`, () =>
        HttpResponse.json(infoResponse()),
      ),
      http.get('http://localhost/api/v1/offices', () =>
        HttpResponse.json({ data: [], page: 1, pages: 0, size: 100, total: 0 }),
      ),
    )

    renderEditPage(officer)

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Bearbeitung nicht erlaubt',
      }),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Änderungen speichern' }),
    ).not.toBeInTheDocument()
  })
})

function renderEditPage(user: AuthUser) {
  const router = createMemoryRouter(
    [
      { element: <InfoEditPage />, path: 'infos/:infoId/edit' },
      {
        element: <h1>Mitteilungsdetails geöffnet</h1>,
        path: 'infos/:infoId',
      },
    ],
    {
      initialEntries: [
        {
          pathname: `/infos/${INFO_ID}/edit`,
          state: {
            from: `/infos/${INFO_ID}`,
            listFrom: '/infos?search=stadtfest',
          },
        },
      ],
    },
  )

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthContext.Provider value={authValue(user)}>
        <FeedbackProvider>
          <ConfirmationProvider>
            <RouterProvider router={router} />
          </ConfirmationProvider>
        </FeedbackProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

function authValue(user: AuthUser): AuthContextValue {
  return {
    isAuthenticated: true,
    isInitializing: false,
    login: vi.fn(async () => user),
    logout: vi.fn(async () => undefined),
    logoutAll: vi.fn(async () => undefined),
    refreshCurrentUser: vi.fn(async () => user),
    register: vi.fn(async () => user),
    state: { status: 'authenticated', user },
    updateCurrentUser: vi.fn(async () => user),
    user,
  }
}

function infoResponse(overrides: Record<string, unknown> = {}) {
  return {
    address: {
      city: 'Leipzig',
      house_number: '12a',
      id: 'address-1',
      latitude: 51.34,
      longitude: 12.37,
      street: 'Musterstraße',
      zip_code: '04109',
    },
    category: 'EVENT',
    created_at: '2026-08-01T08:00:00Z',
    current_status: {
      created_at: '2026-08-01T08:00:00Z',
      id: 'status-1',
      message: 'Created',
      status: 'SCHEDULED',
    },
    description: 'Beschreibung',
    ends_at: '2026-08-12T18:00:00Z',
    id: INFO_ID,
    image_url: null,
    office_id: OFFICE_ID,
    starts_at: '2026-08-12T15:00:00Z',
    title: 'Stadtteilfest',
    updated_at: '2026-08-01T08:00:00Z',
    ...overrides,
  }
}

function officeResponse() {
  return {
    address: null,
    contact_email: 'ordnung@example.test',
    description: null,
    id: OFFICE_ID,
    metadata: {
      created_at: '2026-01-01T08:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    name: 'Ordnungsamt',
    opening_hours: null,
    phone: null,
    services: [],
  }
}
