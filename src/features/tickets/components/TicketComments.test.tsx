import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { TicketComments } from '@/features/tickets/components/TicketComments'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { mockApiServer } from '@/test/server'

const TICKET_ID = '00000000-0000-4000-8000-000000000100'

describe('TicketComments', () => {
  it('distinguishes public comments from internal notes without relying on color', async () => {
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/comments`,
        () => HttpResponse.json(commentResponses()),
      ),
    )

    renderComments()

    const internalNote = await screen.findByText(
      'Interne fachliche Prüfung läuft.',
    )
    const publicComment = screen.getByText(
      'Das Foto wurde am Montag aufgenommen.',
    )

    expect(
      within(internalNote.closest('article')!).getByText('Interne Notiz'),
    ).toBeVisible()
    expect(
      within(publicComment.closest('article')!).getByText('Öffentlich'),
    ).toBeVisible()
    expect(screen.getByText('Behördenmitarbeiter')).toBeVisible()
    expect(screen.getByText('Bürger')).toBeVisible()
    expect(
      screen.getByRole('article', {
        name: /Interne Notiz von Olaf Ordnung/,
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('article', {
        name: /Öffentlicher Kommentar von Clara Bürgerin/,
      }),
    ).toBeVisible()
  })

  it('defaults to an internal note and appends the server-confirmed response', async () => {
    let submittedBody: unknown
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/comments`,
        () => HttpResponse.json([]),
      ),
      http.post(
        `http://localhost/api/v1/tickets/${TICKET_ID}/comments`,
        async ({ request }) => {
          submittedBody = await request.json()
          return HttpResponse.json({
            author: {
              author_type: 'AUTHORITY',
              display_name: 'Olaf Ordnung',
              id: 'officer-1',
            },
            created_at: '2026-08-05T07:00:00Z',
            id: 'comment-new',
            is_internal: true,
            text: 'Bitte zunächst intern prüfen.',
            ticket_id: TICKET_ID,
          })
        },
      ),
    )
    const user = userEvent.setup()

    renderComments()

    const internalOption = await screen.findByRole('radio', {
      name: 'Interne Notiz',
    })
    expect(internalOption).toBeChecked()
    await user.type(
      screen.getByRole('textbox', { name: 'Interne Notiz' }),
      'Bitte zunächst intern prüfen.',
    )
    await user.click(screen.getByRole('button', { name: 'Notiz speichern' }))

    expect(submittedBody).toEqual({
      is_internal: true,
      text: 'Bitte zunächst intern prüfen.',
    })
    expect(
      await screen.findByText('Interne Notiz gespeichert'),
    ).toBeVisible()
    expect(screen.getByText('Bitte zunächst intern prüfen.')).toBeVisible()
    expect(internalOption).toBeChecked()
  })

  it('warns before publishing a citizen-visible immutable comment', async () => {
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/comments`,
        () => HttpResponse.json([]),
      ),
    )
    const user = userEvent.setup()

    renderComments()

    await user.click(
      await screen.findByRole('radio', { name: 'Öffentlicher Kommentar' }),
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Öffentlich sichtbar')
    expect(
      screen.getByRole('button', { name: 'Kommentar veröffentlichen' }),
    ).toBeVisible()
  })
})

function renderComments() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <FeedbackProvider>
        <TicketComments ticketId={TICKET_ID} />
      </FeedbackProvider>
    </QueryClientProvider>,
  )
}

function commentResponses() {
  return [
    {
      author: {
        author_type: 'AUTHORITY',
        display_name: 'Olaf Ordnung',
        id: 'officer-1',
      },
      created_at: '2026-08-02T10:00:00Z',
      id: 'comment-1',
      is_internal: true,
      text: 'Interne fachliche Prüfung läuft.',
      ticket_id: TICKET_ID,
    },
    {
      author: {
        author_type: 'CITIZEN',
        display_name: 'Clara Bürgerin',
        id: null,
      },
      created_at: '2026-08-03T10:00:00Z',
      id: 'comment-2',
      is_internal: false,
      text: 'Das Foto wurde am Montag aufgenommen.',
      ticket_id: TICKET_ID,
    },
  ]
}
