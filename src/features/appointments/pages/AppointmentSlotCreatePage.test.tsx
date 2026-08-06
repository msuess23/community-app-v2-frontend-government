import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { AppointmentSlotCreatePage } from '@/features/appointments/pages/AppointmentSlotCreatePage'
import { ConfirmationProvider } from '@/shared/confirmation/ConfirmationProvider'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { toZonedDateTimeIso } from '@/shared/format/local-date-time'
import { mockApiServer } from '@/test/server'

const OFFICE_ID = '00000000-0000-4000-8000-000000000010'
const OFFICER: AuthUser = {
  email: 'officer@example.test',
  firstName: 'Olivia',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Officer',
  officeId: OFFICE_ID,
  role: 'OFFICER',
}

describe('AppointmentSlotCreatePage', () => {
  it('submits one chronologically normalized batch and returns to the directory', async () => {
    const user = userEvent.setup()
    let requestBody: unknown
    mockApiServer.use(
      http.post(
        `http://localhost/api/v1/offices/${OFFICE_ID}/appointment-slots`,
        async ({ request }) => {
          requestBody = await request.json()
          return HttpResponse.json(
            [
              slotResponse(
                'slot-1',
                toZonedDateTimeIso('2099-08-12T09:30'),
                toZonedDateTimeIso('2099-08-12T10:00'),
              ),
              slotResponse(
                'slot-2',
                toZonedDateTimeIso('2099-08-12T12:00'),
                toZonedDateTimeIso('2099-08-12T12:30'),
              ),
            ],
            { status: 201 },
          )
        },
      ),
    )

    renderCreatePage()

    await screen.findByRole('heading', {
      level: 1,
      name: 'Terminslots anlegen',
    })
    fireEvent.change(screen.getByLabelText(/^Beginn von Terminslot 1/), {
      target: { value: '2099-08-12T12:00' },
    })
    fireEvent.change(screen.getByLabelText(/^Ende von Terminslot 1/), {
      target: { value: '2099-08-12T12:30' },
    })
    await user.click(
      screen.getByRole('button', { name: 'Terminslot hinzufügen' }),
    )
    fireEvent.change(screen.getByLabelText(/^Beginn von Terminslot 2/), {
      target: { value: '2099-08-12T09:30' },
    })
    fireEvent.change(screen.getByLabelText(/^Ende von Terminslot 2/), {
      target: { value: '2099-08-12T10:00' },
    })

    expect(
      screen.getByRole('list', { name: 'Sortierte Slotvorschau' }),
    ).toHaveTextContent('Eingabe 2')
    await user.click(
      screen.getByRole('button', { name: '2 Terminslots anlegen' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Slotübersicht geöffnet' }),
    ).toBeVisible()
    await waitFor(() => {
      expect(requestBody).toEqual({
        slots: [
          {
            ends_at: toZonedDateTimeIso('2099-08-12T10:00'),
            starts_at: toZonedDateTimeIso('2099-08-12T09:30'),
          },
          {
            ends_at: toZonedDateTimeIso('2099-08-12T12:30'),
            starts_at: toZonedDateTimeIso('2099-08-12T12:00'),
          },
        ],
      })
    })
  })
})

function renderCreatePage() {
  const router = createMemoryRouter(
    [
      {
        element: <AppointmentSlotCreatePage />,
        path: 'appointments/slots/new',
      },
      {
        element: <h1>Slotübersicht geöffnet</h1>,
        path: 'appointments/slots',
      },
    ],
    { initialEntries: ['/appointments/slots/new'] },
  )

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthContext.Provider value={authValue(OFFICER)}>
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

function slotResponse(id: string, startsAt: string, endsAt: string) {
  return {
    created_at: '2026-08-06T12:00:00Z',
    ends_at: endsAt,
    id,
    office_id: OFFICE_ID,
    starts_at: startsAt,
    status: 'AVAILABLE',
  }
}
