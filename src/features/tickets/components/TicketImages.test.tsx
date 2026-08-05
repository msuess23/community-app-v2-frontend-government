import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, type RouteObject } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { TicketImages } from '@/features/tickets/components/TicketImages'
import { ConfirmationProvider } from '@/shared/confirmation/ConfirmationProvider'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { mockApiServer } from '@/test/server'

const TICKET_ID = '00000000-0000-4000-8000-000000000100'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'

describe('TicketImages', () => {
  it('requests and labels removed revisions for officers', async () => {
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

    renderImages(officer(), false)

    expect(await screen.findByText('Historisch entfernte Bilder')).toBeVisible()
    expect(screen.getByText('active-image.jpg')).toBeVisible()
    expect(screen.getByText('removed-image.jpg')).toBeVisible()
    expect(includeRemoved).toBe('true')
  })

  it('keeps the removed-image audit view unavailable to dispatchers', async () => {
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

    renderImages(dispatcher(), false)

    expect(await screen.findByText('active-image.jpg')).toBeVisible()
    expect(
      screen.queryByText('Historisch entfernte Bilder'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Bilddateien auswählen'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Bild entfernen:/ }),
    ).not.toBeInTheDocument()
    expect(includeRemoved).toBe('false')
  })

  it('uploads queued images sequentially and preserves per-file server confirmation', async () => {
    const uploadOrder: string[] = []
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/images`,
        () =>
          HttpResponse.json([
            imageResponse('active-image', true, true, null),
          ]),
      ),
      http.post(
        `http://localhost/api/v1/tickets/${TICKET_ID}/images`,
        async ({ request }) => {
          const body = await request.formData()
          const file = body.get('file')
          if (!(file instanceof File)) {
            return new HttpResponse(null, { status: 422 })
          }
          uploadOrder.push(file.name)
          return HttpResponse.json(
            imageResponse(
              `uploaded-${uploadOrder.length}`,
              true,
              false,
              null,
              file.name,
            ),
          )
        },
      ),
    )
    const user = userEvent.setup()

    renderImages(officer(), true)

    const input = await screen.findByLabelText('Bilddateien auswählen')
    await user.upload(input, [
      new File(['first'], 'erstes-bild.jpg', { type: 'image/jpeg' }),
      new File(['second'], 'zweites-bild.png', { type: 'image/png' }),
    ])
    await user.click(screen.getByRole('button', { name: 'Bilder hochladen' }))

    await waitFor(() =>
      expect(uploadOrder).toEqual(['erstes-bild.jpg', 'zweites-bild.png']),
    )
    expect(
      screen.getByText('2 hochgeladen, 0 fehlgeschlagen, 0 ausstehend'),
    ).toBeVisible()
  })

  it('sets the cover and records an optional reason before revision-safe removal', async () => {
    let selectedCover: string | null = null
    let removalBody: unknown
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/images`,
        () =>
          HttpResponse.json([
            imageResponse('cover-image', true, true, null),
            imageResponse('secondary-image', true, false, null),
          ]),
      ),
      http.put(
        `http://localhost/api/v1/tickets/${TICKET_ID}/images/:imageId/cover`,
        ({ params }) => {
          selectedCover = String(params.imageId)
          return HttpResponse.json(
            imageResponse(String(params.imageId), true, true, null),
          )
        },
      ),
      http.delete(
        `http://localhost/api/v1/tickets/${TICKET_ID}/images/:imageId`,
        async ({ request }) => {
          removalBody = await request.json()
          return new HttpResponse(null, { status: 204 })
        },
      ),
    )
    const user = userEvent.setup()

    renderImages(officer(), true)

    await user.click(
      await screen.findByRole('button', {
        name: 'Als Titelbild verwenden: secondary-image.jpg',
      }),
    )
    expect(selectedCover).toBe('secondary-image')
    expect(await screen.findByText('Titelbild aktualisiert')).toBeVisible()

    await user.click(
      screen.getByRole('button', {
        name: 'Bild entfernen: secondary-image.jpg',
      }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Bild entfernen' })
    await user.type(
      screen.getByRole('textbox', { name: 'Begründung' }),
      '  Doppelte Aufnahme  ',
    )
    await user.click(
      dialog.getByRole('button', { name: 'Bild entfernen', exact: true }),
    )

    expect(removalBody).toEqual({ reason: 'Doppelte Aufnahme' })
    expect(await screen.findByText('Ticketbild entfernt')).toBeVisible()
    expect(dialog).not.toBeVisible()
  })
})

function renderImages(user: AuthUser, canManageImages: boolean) {
  const routes: RouteObject[] = [
    {
      path: '/',
      element: (
        <TicketImages
          canManageImages={canManageImages}
          ticketId={TICKET_ID}
        />
      ),
    },
  ]
  const router = createMemoryRouter(routes)

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <FeedbackProvider>
        <ConfirmationProvider>
          <AuthContext.Provider value={authValue(user)}>
            <RouterProvider router={router} />
          </AuthContext.Provider>
        </ConfirmationProvider>
      </FeedbackProvider>
    </QueryClientProvider>,
  )
}

function officer(): AuthUser {
  return {
    email: 'officer@example.test',
    firstName: 'Olaf',
    id: 'officer-1',
    lastName: 'Ordnung',
    officeId: OFFICE_ID,
    role: 'OFFICER',
  }
}

function dispatcher(): AuthUser {
  return {
    email: 'dispatcher@example.test',
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
  originalFilename = `${id}.jpg`,
) {
  return {
    height: 720,
    id,
    is_active: isActive,
    is_cover: isCover,
    mime_type: originalFilename.endsWith('.png') ? 'image/png' : 'image/jpeg',
    original_filename: originalFilename,
    removed_at: removedAt,
    size_bytes: 1200,
    ticket_id: TICKET_ID,
    uploaded_at: '2026-08-02T08:00:00Z',
    url: `/api/v1/tickets/${TICKET_ID}/images/${id}/content`,
    width: 1280,
  }
}
