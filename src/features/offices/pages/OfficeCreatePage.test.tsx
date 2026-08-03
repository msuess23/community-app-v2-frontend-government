import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { OfficeCreatePage } from '@/features/offices/pages/OfficeCreatePage'
import { ConfirmationProvider } from '@/shared/confirmation/ConfirmationProvider'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { mockApiServer } from '@/test/server'

const OFFICE_ID = '00000000-0000-4000-8000-000000000010'

describe('OfficeCreatePage', () => {
  it('creates an office and returns to the new detail route', async () => {
    const user = userEvent.setup()
    let requestBody: unknown

    mockApiServer.use(
      http.post('http://localhost/api/v1/offices', async ({ request }) => {
        requestBody = await request.json()
        return HttpResponse.json(
          officeResponse({ name: 'Bürgerbüro Mitte' }),
          { status: 201 },
        )
      }),
    )

    renderCreatePage()

    await user.type(
      screen.getByRole('textbox', { name: /Name der Behörde/ }),
      'Bürgerbüro Mitte',
    )
    await user.click(screen.getByRole('button', { name: 'Behörde anlegen' }))

    expect(
      await screen.findByRole('heading', { name: 'Behördendetails geöffnet' }),
    ).toBeVisible()
    expect(requestBody).toEqual({
      address: null,
      contact_email: null,
      description: null,
      name: 'Bürgerbüro Mitte',
      opening_hours: null,
      phone: null,
      services: [],
    })
  })
})

function renderCreatePage() {
  const router = createMemoryRouter(
    [
      { element: <OfficeCreatePage />, path: 'offices/new' },
      {
        element: <h1>Behördendetails geöffnet</h1>,
        path: 'offices/:officeId',
      },
    ],
    {
      initialEntries: [
        {
          pathname: '/offices/new',
          state: { from: '/offices?search=mitte' },
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
    address: null,
    contact_email: null,
    description: null,
    id: OFFICE_ID,
    metadata: {
      created_at: '2026-08-04T00:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    name: 'Bürgerbüro Mitte',
    opening_hours: null,
    phone: null,
    services: [],
    ...overrides,
  }
}
