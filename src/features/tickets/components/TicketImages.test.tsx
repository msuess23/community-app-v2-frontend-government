import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, type RouteObject } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { TicketImages } from '@/features/tickets/components/TicketImages'
import { mockApiServer } from '@/test/server'

const TICKET_ID = '00000000-0000-4000-8000-000000000100'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'

describe('TicketImages', () => {
  it('shows current and removed revisions read-only for officers', async () => {
    let includeRemoved: string | null = null
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/images`,
        ({ request }) => {
          includeRemoved = new URL(request.url).searchParams.get(
            'include_removed',
          )
          return HttpResponse.json([
            imageResponse('active-image', true, true, null),
            imageResponse(
              'removed-image',
              false,
              false,
              '2026-08-03T10:00:00Z',
            ),
          ])
        },
      ),
    )

    renderImages(officer())

    expect(
      await screen.findByRole('region', { name: 'Aktuelle Ticketbilder' }),
    ).toBeVisible()
    expect(screen.getByText('Historisch entfernte Bilder')).toBeVisible()
    expect(screen.getByText('active-image.jpg')).toBeVisible()
    expect(screen.getByText('removed-image.jpg')).toBeVisible()
    expect(
      screen.queryByLabelText('Bilddateien auswählen'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Als Titelbild verwenden:/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Bild entfernen:/ }),
    ).not.toBeInTheDocument()
    expect(includeRemoved).toBe('true')
  })

  it('keeps the removed-image audit gallery unavailable to dispatchers', async () => {
    let includeRemoved: string | null = null
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/images`,
        ({ request }) => {
          includeRemoved = new URL(request.url).searchParams.get(
            'include_removed',
          )
          return HttpResponse.json([
            imageResponse('active-image', true, true, null),
          ])
        },
      ),
    )

    renderImages(dispatcher())

    expect(await screen.findByText('active-image.jpg')).toBeVisible()
    expect(
      screen.queryByText('Historisch entfernte Bilder'),
    ).not.toBeInTheDocument()
    expect(includeRemoved).toBe('false')
  })
})

function renderImages(user: AuthUser) {
  const routes: RouteObject[] = [
    {
      path: '/',
      element: <TicketImages ticketId={TICKET_ID} />,
    },
  ]
  const router = createMemoryRouter(routes)

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthContext.Provider value={authValue(user)}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

function officer(): AuthUser {
  return {
    email: 'officer@example.com',
    firstName: 'Olaf',
    id: 'officer-1',
    lastName: 'Ordnung',
    officeId: OFFICE_ID,
    role: 'OFFICER',
  }
}

function dispatcher(): AuthUser {
  return {
    email: 'dispatcher@example.com',
    firstName: 'Dora',
    id: 'dispatcher-1',
    lastName: 'Disposition',
    officeId: null,
    role: 'DISPATCHER',
  }
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

function imageResponse(
  id: string,
  isActive: boolean,
  isCover: boolean,
  removedAt: string | null,
) {
  return {
    height: 720,
    id,
    is_active: isActive,
    is_cover: isCover,
    mime_type: 'image/jpeg',
    original_filename: `${id}.jpg`,
    removed_at: removedAt,
    size_bytes: 1200,
    ticket_id: TICKET_ID,
    uploaded_at: '2026-08-02T08:00:00Z',
    url: `/api/v1/tickets/${TICKET_ID}/images/${id}/content`,
    width: 1280,
  }
}
