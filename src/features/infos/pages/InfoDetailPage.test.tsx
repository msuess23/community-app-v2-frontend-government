import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { InfoDetailPage } from '@/features/infos/pages/InfoDetailPage'
import { ConfirmationProvider } from '@/shared/confirmation/ConfirmationProvider'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { mockApiServer } from '@/test/server'

const INFO_ID = '00000000-0000-4000-8000-000000000100'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'
const ADMIN: AuthUser = {
  email: 'admin@example.test',
  firstName: 'Ada',
  id: 'admin-1',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}
const DISPATCHER: AuthUser = {
  email: 'dispatcher@example.test',
  firstName: 'Dora',
  id: 'dispatcher-1',
  lastName: 'Dispatcher',
  officeId: OFFICE_ID,
  role: 'DISPATCHER',
}

describe('InfoDetailPage', () => {
  it('renders accessible images, address and the simple public status history', async () => {
    const user = userEvent.setup()

    mockApiServer.use(
      http.get(`http://localhost/api/v1/infos/${INFO_ID}`, () =>
        HttpResponse.json(infoResponse()),
      ),
      http.get(`http://localhost/api/v1/infos/${INFO_ID}/images`, () =>
        HttpResponse.json([
          imageResponse(),
          imageResponse({
            altText: 'Umleitungsskizze rund um die Parkstraße',
            id: 'image-2',
            isCover: false,
            originalFilename: 'umleitung.webp',
          }),
        ]),
      ),
      http.get(`http://localhost/api/v1/infos/${INFO_ID}/status`, () =>
        HttpResponse.json([
          infoResponse().current_status,
          {
            created_at: '2026-08-01T08:00:00Z',
            id: 'status-created',
            message: 'Created',
            status: 'SCHEDULED',
          },
        ]),
      ),
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json(officeResponse()),
      ),
    )

    renderDetail(DISPATCHER)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Stadtteilfest' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Musterstraße 12a')).toBeVisible()
    expect(
      await screen.findByRole('link', { name: 'Ordnungsamt' }),
    ).toHaveAttribute('href', `/offices/${OFFICE_ID}`)
    expect(screen.queryByText('Breitengrad')).not.toBeInTheDocument()
    expect(screen.queryByText('Längengrad')).not.toBeInTheDocument()
    expect(screen.queryByText(INFO_ID)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Mitteilung bearbeiten' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Status aktualisieren' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Mitteilung löschen' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Bilder hochladen' }),
    ).not.toBeInTheDocument()

    const gallery = await screen.findByRole('region', {
      name: 'Bilder der Mitteilung',
    })
    expect(gallery).toHaveAttribute('aria-roledescription', 'Karussell')
    expect(
      within(gallery).getByRole('img', {
        name: 'Bühne und Informationsstände auf dem Leipziger Markt',
      }),
    ).toBeVisible()
    expect(within(gallery).getByText('Titelbild')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Zu weiteren Bildern scrollen' }),
    ).toBeVisible()

    const statusRegion = screen.getByRole('region', { name: 'Statusverlauf' })
    expect(
      within(statusRegion).getByText('Findet wie geplant statt.'),
    ).toBeVisible()
    expect(within(statusRegion).getByText('Created')).toBeVisible()
    expect(
      within(statusRegion).queryByText(/ausgeführt von/i),
    ).not.toBeInTheDocument()

    await user.click(
      within(gallery).getByRole('button', {
        name: 'Bild vergrößern: Bühne und Informationsstände auf dem Leipziger Markt',
      }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Bildvorschau' })
    expect(
      within(dialog).getByRole('img', {
        name: 'Bühne und Informationsstände auf dem Leipziger Markt',
      }),
    ).toBeVisible()
    await user.click(
      within(dialog).getByRole('button', { name: 'Nächstes Bild anzeigen' }),
    )
    expect(
      within(dialog).getByRole('img', {
        name: 'Umleitungsskizze rund um die Parkstraße',
      }),
    ).toBeVisible()
    await user.click(
      within(dialog).getByRole('button', { name: 'Bildvorschau schließen' }),
    )
    expect(
      screen.queryByRole('dialog', { name: 'Bildvorschau' }),
    ).not.toBeInTheDocument()
  })

  it('publishes a new public status entry and updates the current projection', async () => {
    const user = userEvent.setup()
    const statusRequests: unknown[] = []
    let storedInfo = infoResponse()
    let statusHistory = [storedInfo.current_status]

    mockApiServer.use(
      http.get(`http://localhost/api/v1/infos/${INFO_ID}`, () =>
        HttpResponse.json(storedInfo),
      ),
      http.get(`http://localhost/api/v1/infos/${INFO_ID}/images`, () =>
        HttpResponse.json([]),
      ),
      http.get(`http://localhost/api/v1/infos/${INFO_ID}/status`, () =>
        HttpResponse.json(statusHistory),
      ),
      http.put(
        `http://localhost/api/v1/infos/${INFO_ID}/status`,
        async ({ request }) => {
          const body = await request.json()
          statusRequests.push(body)
          const statusEntry = {
            created_at: '2026-08-05T08:00:00Z',
            id: 'status-cancelled',
            message: 'Das Fest fällt wegen des Unwetters aus.',
            status: 'CANCELLED' as const,
          }
          statusHistory = [statusEntry, ...statusHistory]
          storedInfo = {
            ...storedInfo,
            current_status: statusEntry,
            updated_at: statusEntry.created_at,
          }
          return HttpResponse.json(statusEntry)
        },
      ),
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json(officeResponse()),
      ),
    )

    renderDetail(ADMIN)

    await user.click(
      await screen.findByRole('button', { name: 'Status aktualisieren' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Status aktualisieren' })
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: /Neuer Status/ }),
      'CANCELLED',
    )
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Öffentliche Nachricht' }),
      'Das Fest fällt wegen des Unwetters aus.',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Status veröffentlichen' }),
    )

    await waitFor(() => {
      expect(statusRequests).toEqual([
        {
          message: 'Das Fest fällt wegen des Unwetters aus.',
          status: 'CANCELLED',
        },
      ])
    })
    expect(
      await within(
        screen.getByRole('region', { name: 'Statusverlauf' }),
      ).findByText('Das Fest fällt wegen des Unwetters aus.'),
    ).toBeVisible()
    expect(screen.getAllByText('Abgesagt').length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('dialog', { name: 'Status aktualisieren' }),
    ).not.toBeInTheDocument()
  })

  it('physically deletes an Info and returns to the preserved directory state', async () => {
    const user = userEvent.setup()
    const deleteRequests: string[] = []

    mockApiServer.use(
      http.get(`http://localhost/api/v1/infos/${INFO_ID}`, () =>
        HttpResponse.json(infoResponse()),
      ),
      http.get(`http://localhost/api/v1/infos/${INFO_ID}/images`, () =>
        HttpResponse.json([]),
      ),
      http.get(`http://localhost/api/v1/infos/${INFO_ID}/status`, () =>
        HttpResponse.json([infoResponse().current_status]),
      ),
      http.delete(`http://localhost/api/v1/infos/${INFO_ID}`, () => {
        deleteRequests.push(INFO_ID)
        return new HttpResponse(null, { status: 204 })
      }),
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json(officeResponse()),
      ),
    )

    renderDetail(ADMIN)

    await user.click(
      await screen.findByRole('button', { name: 'Mitteilung löschen' }),
    )
    const dialog = screen.getByRole('dialog', {
      name: 'Mitteilung endgültig löschen',
    })
    expect(within(dialog).getByText(/Statusverlauf/)).toBeVisible()
    expect(within(dialog).getByText(/Bilddateien/)).toBeVisible()
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()

    await user.click(
      within(dialog).getByRole('button', {
        name: 'Mitteilung endgültig löschen',
      }),
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mitteilungen' }),
    ).toBeVisible()
    expect(deleteRequests).toEqual([INFO_ID])
  })
})

function renderDetail(user: AuthUser) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <FeedbackProvider>
        <ConfirmationProvider>
          <AuthContext.Provider value={authValue(user)}>
            <MemoryRouter
              initialEntries={[
                {
                  pathname: `/infos/${INFO_ID}`,
                  state: { from: '/infos?search=stadtfest' },
                },
              ]}
            >
              <Routes>
                <Route
                  path="infos"
                  element={<h1 data-page-heading="true">Mitteilungen</h1>}
                />
                <Route path="infos/:infoId" element={<InfoDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext.Provider>
        </ConfirmationProvider>
      </FeedbackProvider>
    </QueryClientProvider>,
  )
}

function infoResponse() {
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
      created_at: '2026-08-02T08:00:00Z',
      id: 'status-active',
      message: 'Findet wie geplant statt.',
      status: 'ACTIVE',
    },
    description: 'Sommerfest mit Bühnenprogramm.',
    ends_at: '2026-08-12T20:00:00Z',
    id: INFO_ID,
    image_url: `/api/v1/infos/${INFO_ID}/images/image-1/content`,
    office_id: OFFICE_ID,
    starts_at: '2026-08-12T15:00:00Z',
    title: 'Stadtteilfest',
    updated_at: '2026-08-02T08:00:00Z',
  }
}

function imageResponse(
  overrides: Readonly<{
    altText?: string
    id?: string
    isCover?: boolean
    originalFilename?: string
  }> = {},
) {
  const id = overrides.id ?? 'image-1'
  return {
    alt_text:
      overrides.altText ??
      'Bühne und Informationsstände auf dem Leipziger Markt',
    height: 800,
    id,
    info_id: INFO_ID,
    is_cover: overrides.isCover ?? true,
    mime_type: 'image/webp',
    original_filename: overrides.originalFilename ?? 'markt.webp',
    size_bytes: 123456,
    uploaded_at: '2026-08-01T08:00:00Z',
    url: `/api/v1/infos/${INFO_ID}/images/${id}/content`,
    width: 1200,
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
