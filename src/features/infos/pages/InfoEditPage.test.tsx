import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
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
  email: 'admin@example.com',
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
      http.get(`http://localhost/api/v1/infos/${INFO_ID}/images`, () =>
        HttpResponse.json([]),
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

  it(
    'uploads images with alt text, selects a cover and reloads the replacement after deletion',
    async () => {
      const user = userEvent.setup()
      const uploadRequests: Array<{ altText: string; filename: string }> = []
      const coverRequests: string[] = []
      const deleteRequests: string[] = []
      let images = [imageResponse()]

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
        http.get(`http://localhost/api/v1/infos/${INFO_ID}/images`, () =>
          HttpResponse.json(images),
        ),
        http.post(
          `http://localhost/api/v1/infos/${INFO_ID}/images`,
          async ({ request }) => {
            const body = await request.formData()
            const file = body.get('file')
            const altText = String(body.get('alt_text') ?? '')
            if (
              typeof file !== 'object' ||
              file === null ||
              !('name' in file)
            ) {
              return HttpResponse.json({}, { status: 422 })
            }

            uploadRequests.push({ altText, filename: String(file.name) })
            const uploaded = imageResponse({
              altText,
              id: 'image-2',
              isCover: false,
              originalFilename: String(file.name),
            })
            images = [...images, uploaded]
            return HttpResponse.json(uploaded, { status: 201 })
          },
        ),
        http.put(
          `http://localhost/api/v1/infos/${INFO_ID}/images/:imageId/cover`,
          ({ params }) => {
            const imageId = String(params.imageId)
            coverRequests.push(imageId)
            images = images.map((image) => ({
              ...image,
              is_cover: image.id === imageId,
            }))
            return HttpResponse.json(
              images.find((image) => image.id === imageId),
            )
          },
        ),
        http.delete(
          `http://localhost/api/v1/infos/${INFO_ID}/images/:imageId`,
          ({ params }) => {
            const imageId = String(params.imageId)
            deleteRequests.push(imageId)
            const deletedCover = images.find(
              (image) => image.id === imageId,
            )?.is_cover
            images = images.filter((image) => image.id !== imageId)
            if (deletedCover && images.length > 0) {
              images = images.map((image, index) => ({
                ...image,
                is_cover: index === 0,
              }))
            }
            return new HttpResponse(null, { status: 204 })
          },
        ),
      )

      renderEditPage(ADMIN)

      await screen.findByRole('heading', { level: 1, name: 'Stadtteilfest' })
      const uploadFile = new File(['second-image'], 'umleitung.png', {
        type: 'image/png',
      })
      await user.upload(
        await screen.findByLabelText('Bilddateien auswählen'),
        uploadFile,
      )
      await user.type(
        screen.getByRole('textbox', {
          name: 'Alternativtext für umleitung.png',
        }),
        'Umleitung rund um die Parkstraße',
      )
      await user.click(
        screen.getByRole('button', { name: 'Bilder hochladen' }),
      )

      expect(
        await screen.findByRole(
          'img',
          { name: 'Umleitung rund um die Parkstraße' },
          { timeout: 10_000 },
        ),
      ).toBeVisible()
      expect(uploadRequests).toEqual([
        {
          altText: 'Umleitung rund um die Parkstraße',
          filename: 'umleitung.png',
        },
      ])

      await user.click(
        screen.getByRole('button', {
          name: 'Als Titelbild verwenden: Umleitung rund um die Parkstraße',
        }),
      )
      await waitFor(() => expect(coverRequests).toEqual(['image-2']))
      const newCoverFigure = screen
        .getByRole('img', { name: 'Umleitung rund um die Parkstraße' })
        .closest('figure')
      expect(newCoverFigure).not.toBeNull()
      expect(
        await within(newCoverFigure as HTMLElement).findByText('Titelbild'),
      ).toBeVisible()

      await user.click(
        screen.getByRole('button', {
          name: 'Bild löschen: Umleitung rund um die Parkstraße',
        }),
      )
      const confirmation = screen.getByRole('dialog', {
        name: 'Bild löschen?',
      })
      await user.click(
        within(confirmation).getByRole('button', {
          name: 'Bild endgültig löschen',
        }),
      )

      await waitFor(() => {
        expect(
          screen.queryByRole('img', {
            name: 'Umleitung rund um die Parkstraße',
          }),
        ).not.toBeInTheDocument()
      })
      expect(deleteRequests).toEqual(['image-2'])
      const replacementCoverFigure = screen
        .getByRole('img', {
          name: 'Bühne und Informationsstände auf dem Leipziger Markt',
        })
        .closest('figure')
      expect(replacementCoverFigure).not.toBeNull()
      expect(
        await within(replacementCoverFigure as HTMLElement).findByText(
          'Titelbild',
        ),
      ).toBeVisible()
    },
    15_000,
  )

  it('protects selected but not yet uploaded images from accidental navigation', async () => {
    const user = userEvent.setup()

    mockApiServer.use(
      http.get(`http://localhost/api/v1/infos/${INFO_ID}`, () =>
        HttpResponse.json(infoResponse()),
      ),
      http.get('http://localhost/api/v1/offices', () =>
        HttpResponse.json({
          data: [officeResponse()],
          page: 1,
          pages: 1,
          size: 20,
          total: 1,
        }),
      ),
      http.get(`http://localhost/api/v1/infos/${INFO_ID}/images`, () =>
        HttpResponse.json([]),
      ),
    )

    renderEditPage(ADMIN)

    await user.upload(
      await screen.findByLabelText('Bilddateien auswählen'),
      new File(['image'], 'ungespeichert.png', { type: 'image/png' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Zurück zur Mitteilung' }),
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Ungespeicherte Änderungen verwerfen?',
    })
    expect(dialog).toContainElement(
      within(dialog).getByText(/ausgewählten Bilder wurden noch nicht/),
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Weiter bearbeiten' }),
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Stadtteilfest' }),
    ).toBeVisible()
  })

  it('keeps pending images protected after saving only master data', async () => {
    const user = userEvent.setup()

    mockApiServer.use(
      http.get(`http://localhost/api/v1/infos/${INFO_ID}`, () =>
        HttpResponse.json(infoResponse()),
      ),
      http.get('http://localhost/api/v1/offices', () =>
        HttpResponse.json({
          data: [officeResponse()],
          page: 1,
          pages: 1,
          size: 20,
          total: 1,
        }),
      ),
      http.get(`http://localhost/api/v1/infos/${INFO_ID}/images`, () =>
        HttpResponse.json([]),
      ),
      http.put(`http://localhost/api/v1/infos/${INFO_ID}`, () =>
        HttpResponse.json(
          infoResponse({ description: 'Aktualisierte Beschreibung' }),
        ),
      ),
    )

    renderEditPage(ADMIN)

    await user.upload(
      await screen.findByLabelText('Bilddateien auswählen'),
      new File(['image'], 'noch-offen.png', { type: 'image/png' }),
    )
    const description = screen.getByRole('textbox', { name: 'Beschreibung' })
    await user.clear(description)
    await user.type(description, 'Aktualisierte Beschreibung')
    await user.click(
      screen.getByRole('button', { name: 'Änderungen speichern' }),
    )

    expect(await screen.findByText('Stammdaten gespeichert')).toBeVisible()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Stadtteilfest' }),
    ).toBeVisible()
    expect(screen.getByText('noch-offen.png')).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: 'Zurück zur Mitteilung' }),
    )
    expect(
      screen.getByRole('dialog', {
        name: 'Ungespeicherte Änderungen verwerfen?',
      }),
    ).toBeVisible()
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
    height: 1,
    id,
    info_id: INFO_ID,
    is_cover: overrides.isCover ?? true,
    mime_type: 'image/png',
    original_filename: overrides.originalFilename ?? 'markt.png',
    size_bytes: 68,
    uploaded_at: '2026-08-01T08:00:00Z',
    url: `/api/v1/infos/${INFO_ID}/images/${id}/content`,
    width: 1,
  }
}

function officeResponse() {
  return {
    address: null,
    contact_email: 'ordnung@example.com',
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
