import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { createQueryClient } from '@/app/query-client'
import { TicketComments } from '@/features/tickets/components/TicketComments'
import { mockApiServer } from '@/test/server'

const TICKET_ID = '00000000-0000-4000-8000-000000000100'

describe('TicketComments', () => {
  it('distinguishes public comments from internal notes without relying on color', async () => {
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/tickets/${TICKET_ID}/comments`,
        () =>
          HttpResponse.json([
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
          ]),
      ),
    )

    render(
      <QueryClientProvider client={createQueryClient()}>
        <TicketComments ticketId={TICKET_ID} />
      </QueryClientProvider>,
    )

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
  })
})
