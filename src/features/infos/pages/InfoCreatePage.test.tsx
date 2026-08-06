import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { InfoCreatePage } from '@/features/infos/pages/InfoCreatePage'
import { ConfirmationProvider } from '@/shared/confirmation/ConfirmationProvider'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { mockApiServer } from '@/test/server'

const INFO_ID = '00000000-0000-4000-8000-000000000100'
const OFFICE_ID = '00000000-0000-4000-8000-000000000010'
const OFFICER: AuthUser = {
  email: 'officer@example.test',
  firstName: 'Olivia',
  id: 'user-1',
  lastName: 'Officer',
  officeId: OFFICE_ID,
  role: 'OFFICER',
}

describe('InfoCreatePage', () => {
  it('creates master data and selected images with one form submission', async () => {
    const user = userEvent.setup()
    let requestBody: unknown
    const requestOrder: string[] = []
    const uploadRequests: Array<{ altText: string; filename: string }> = []

    mockApiServer.use(
      http.get('http://localhost/api/v1/offices', () =>
        HttpResponse.json({
          data: [officeResponse()],
          page: 1,
          pages: 1,
          size: 100,
          total: 1,
        }),
      ),
      http.post('http://localhost/api/v1/infos', async ({ request }) => {
        requestOrder.push('info')
        requestBody = await request.json()
        return HttpResponse.json(infoResponse(), { status: 201 })
      }),
      http.post(
        `http://localhost/api/v1/infos/${INFO_ID}/images`,
        async ({ request }) => {
          requestOrder.push('image')
          const body = await request.formData()
          const file = body.get('file')
          uploadRequests.push({
            altText: String(body.get('alt_text') ?? ''),
            filename:
              typeof file === 'object' && file !== null && 'name' in file
                ? String(file.name)
                : '',
          })
          const upload = uploadRequests.at(-1)!
          return HttpResponse.json(
            {
              alt_text: upload.altText,
              height: 1,
              id: `image-${uploadRequests.length}`,
              info_id: INFO_ID,
              is_cover: uploadRequests.length === 1,
              mime_type: 'image/png',
              original_filename: upload.filename,
              size_bytes: 12,
              uploaded_at: '2026-08-04T08:00:00Z',
              url: `/api/v1/infos/${INFO_ID}/images/image-${uploadRequests.length}/content`,
              width: 1,
            },
            { status: 201 },
          )
        },
      ),
    )

    renderCreatePage(OFFICER)

    await screen.findByRole('heading', { name: 'Mitteilung anlegen' })
    expect(screen.getByText('Ordnungsamt')).toBeVisible()
    expect(
      screen.queryByRole('combobox', { name: 'Zuständige Behörde' }),
    ).not.toBeInTheDocument()
    await user.type(
      screen.getByRole('textbox', { name: /Titel/ }),
      'Straßensperrung Innenstadt',
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Kategorie/ }),
      'CONSTRUCTION',
    )
    fireEvent.change(await screen.findByLabelText(/Beginn/), {
      target: { value: '2026-08-12T17:00' },
    })
    fireEvent.change(await screen.findByLabelText(/Ende/), {
      target: { value: '2026-08-12T20:00' },
    })
    const firstImage = new File(['first'], 'umleitung.png', {
      type: 'image/png',
    })
    const coverImage = new File(['cover'], 'titelbild.png', {
      type: 'image/png',
    })
    await user.upload(
      await screen.findByLabelText('Bilddateien auswählen'),
      [firstImage, coverImage],
    )
    await user.type(
      screen.getByRole('textbox', {
        name: 'Alternativtext für umleitung.png',
      }),
      'Umleitung rund um die Parkstraße',
    )
    await user.type(
      screen.getByRole('textbox', {
        name: 'Alternativtext für titelbild.png',
      }),
      'Absperrung vor dem Leipziger Markt',
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Als Titelbild vormerken: titelbild.png',
      }),
    )
    expect(
      screen.queryByRole('button', { name: 'Bilder hochladen' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mitteilung anlegen' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Mitteilungsdetails geöffnet',
      }),
    ).toBeVisible()
    expect(requestOrder).toEqual(['info', 'image', 'image'])
    expect(uploadRequests).toEqual([
      {
        altText: 'Absperrung vor dem Leipziger Markt',
        filename: 'titelbild.png',
      },
      {
        altText: 'Umleitung rund um die Parkstraße',
        filename: 'umleitung.png',
      },
    ])
    expect(requestBody).toEqual({
      address: null,
      category: 'CONSTRUCTION',
      description: null,
      ends_at: '2026-08-12T18:00:00.000Z',
      office_id: OFFICE_ID,
      starts_at: '2026-08-12T15:00:00.000Z',
      title: 'Straßensperrung Innenstadt',
    })
  })
})

function renderCreatePage(user: AuthUser) {
  const router = createMemoryRouter(
    [
      { element: <InfoCreatePage />, path: 'infos/new' },
      {
        element: <h1>Mitteilungsdetails geöffnet</h1>,
        path: 'infos/:infoId',
      },
    ],
    {
      initialEntries: [
        {
          pathname: '/infos/new',
          state: { from: '/infos?search=sperrung' },
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

function infoResponse() {
  return {
    address: null,
    category: 'CONSTRUCTION',
    created_at: '2026-08-04T08:00:00Z',
    current_status: {
      created_at: '2026-08-04T08:00:00Z',
      id: 'status-1',
      message: 'Created',
      status: 'SCHEDULED',
    },
    description: null,
    ends_at: '2026-08-12T18:00:00Z',
    id: INFO_ID,
    image_url: null,
    office_id: OFFICE_ID,
    starts_at: '2026-08-12T15:00:00Z',
    title: 'Straßensperrung Innenstadt',
    updated_at: '2026-08-04T08:00:00Z',
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
