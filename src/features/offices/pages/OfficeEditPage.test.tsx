import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { OfficeEditPage } from '@/features/offices/pages/OfficeEditPage'
import { ConfirmationProvider } from '@/shared/confirmation/ConfirmationProvider'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { mockApiServer } from '@/test/server'

const OFFICE_ID = '00000000-0000-4000-8000-000000000010'

describe('OfficeEditPage', () => {
  it('sends a minimal partial update and preserves hidden coordinates', async () => {
    const user = userEvent.setup()
    let requestBody: unknown

    mockApiServer.use(
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json(officeResponse()),
      ),
      http.patch(
        `http://localhost/api/v1/offices/${OFFICE_ID}`,
        async ({ request }) => {
          requestBody = await request.json()
          return HttpResponse.json(
            officeResponse({
              address: {
                ...officeResponse().address,
                city: 'Markkleeberg',
              },
              description: 'Neue Beschreibung',
            }),
          )
        },
      ),
    )

    renderEditPage()

    const description = await screen.findByRole('textbox', {
      name: 'Beschreibung',
    })
    await user.clear(description)
    await user.type(description, 'Neue Beschreibung')

    const city = screen.getByRole('textbox', { name: /Ort/ })
    await user.clear(city)
    await user.type(city, 'Markkleeberg')
    await user.type(
      screen.getByRole('textbox', { name: /Änderungsgrund/ }),
      'Zuständigkeit angepasst',
    )
    await user.click(
      screen.getByRole('button', { name: 'Änderungen speichern' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Behördendetails geöffnet' }),
    ).toBeVisible()
    expect(requestBody).toEqual({
      address: { city: 'Markkleeberg' },
      change_reason: 'Zuständigkeit angepasst',
      description: 'Neue Beschreibung',
    })
  })

  it('does not expose an edit form for a deactivated office', async () => {
    mockApiServer.use(
      http.get(`http://localhost/api/v1/offices/${OFFICE_ID}`, () =>
        HttpResponse.json(
          officeResponse({
            metadata: {
              created_at: '2026-08-01T10:00:00Z',
              deactivated_at: '2026-08-03T10:00:00Z',
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

function renderEditPage() {
  const router = createMemoryRouter(
    [
      { element: <OfficeEditPage />, path: 'offices/:officeId/edit' },
      {
        element: <h1>Behördendetails geöffnet</h1>,
        path: 'offices/:officeId',
      },
    ],
    {
      initialEntries: [
        {
          pathname: `/offices/${OFFICE_ID}/edit`,
          state: {
            from: `/offices/${OFFICE_ID}`,
            listFrom: '/offices?search=ordnung',
          },
        },
      ],
    },
  )

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <FeedbackProvider>
        <ConfirmationProvider>
          <RouterProvider router={router} />
        </ConfirmationProvider>
      </FeedbackProvider>
    </QueryClientProvider>,
  )
}

function officeResponse(overrides: Record<string, unknown> = {}) {
  return {
    address: {
      city: 'Leipzig',
      house_number: '12a',
      id: '00000000-0000-4000-8000-000000000020',
      latitude: 51.3397,
      longitude: 12.3731,
      street: 'Musterstraße',
      zip_code: '04109',
    },
    contact_email: 'ordnung@example.test',
    description: 'Zentrale Anlaufstelle',
    id: OFFICE_ID,
    metadata: {
      created_at: '2026-08-01T10:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    name: 'Ordnungsamt',
    opening_hours: { monday: '08:00-12:00' },
    phone: '+49 341 123456',
    services: ['Fundbüro'],
    ...overrides,
  }
}
