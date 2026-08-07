import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { AppointmentSlotDirectoryPage } from '@/features/appointments/pages/AppointmentSlotDirectoryPage'
import { ConfirmationProvider } from '@/shared/confirmation/ConfirmationProvider'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { mockApiServer } from '@/test/server'

const OFFICE_ID = '00000000-0000-4000-8000-000000000010'
const OFFICER: AuthUser = {
  email: 'officer@example.com',
  firstName: 'Olivia',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Officer',
  officeId: OFFICE_ID,
  role: 'OFFICER',
}

describe('AppointmentSlotDirectoryPage', () => {
  it('renders equivalent responsive views and sends every supported slot filter', async () => {
    let requestedSearch = ''
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/offices/${OFFICE_ID}/appointment-slots`,
        ({ request }) => {
          requestedSearch = new URL(request.url).search
          return HttpResponse.json({
            data: [slotResponse()],
            page: 1,
            pages: 1,
            size: 20,
            total: 1,
          })
        },
      ),
    )

    renderDirectory(
      '/appointments/slots?status=AVAILABLE&startsFrom=2026-08-10&startsTo=2026-08-12&sortBy=status&sortDirection=desc',
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Terminslots' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toHaveValue('AVAILABLE')
    expect(screen.getByLabelText('Sortierung')).toHaveValue('status:desc')
    expect(
      screen.getByRole('link', { name: 'Terminslots anlegen' }),
    ).toHaveAttribute('href', '/appointments/slots/new')

    const table = await screen.findByRole('table', {
      name: 'Terminslotverzeichnis',
    })
    expect(within(table).getByText('Verstrichen')).toBeVisible()
    expect(within(table).getByText('30 Minuten')).toBeVisible()

    const compactList = screen.getByRole('list', {
      name: 'Terminslotverzeichnis',
    })
    expect(within(compactList).getByText('Verstrichen')).toBeVisible()

    await waitFor(() => {
      expect(requestedSearch).toContain('status=AVAILABLE')
      expect(requestedSearch).toContain(
        'starts_from=2026-08-09T22%3A00%3A00.000Z',
      )
      expect(requestedSearch).toContain(
        'starts_to=2026-08-12T21%3A59%3A59.999Z',
      )
      expect(requestedSearch).toContain('sort_by=status')
      expect(requestedSearch).toContain('order=desc')
    })
  })
})

function renderDirectory(initialEntry: string) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthContext.Provider value={authValue(OFFICER)}>
        <FeedbackProvider>
          <ConfirmationProvider>
            <MemoryRouter initialEntries={[initialEntry]}>
              <AppointmentSlotDirectoryPage />
            </MemoryRouter>
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

function slotResponse() {
  return {
    created_at: '2020-01-01T08:00:00Z',
    ends_at: '2020-01-02T09:30:00Z',
    id: '00000000-0000-4000-8000-000000000100',
    office_id: OFFICE_ID,
    starts_at: '2020-01-02T09:00:00Z',
    status: 'AVAILABLE',
  }
}
