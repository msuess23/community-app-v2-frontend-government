import { describe, expect, it } from 'vitest'

import {
  mapTicketCommentResponse,
  mapTicketImageResponse,
} from '@/features/tickets/model/ticket-collaboration'

describe('ticket collaboration mappers', () => {
  it('maps privacy-aware comment authors without exposing transport fields', () => {
    expect(
      mapTicketCommentResponse({
        author: {
          author_type: 'AUTHORITY',
          display_name: 'Olaf Ordnung',
          id: 'officer-1',
        },
        created_at: '2026-08-02T10:00:00Z',
        id: 'comment-1',
        is_internal: true,
        text: 'Interne fachliche Prüfung läuft.',
        ticket_id: 'ticket-1',
      }),
    ).toEqual({
      author: {
        authorType: 'AUTHORITY',
        displayName: 'Olaf Ordnung',
        id: 'officer-1',
      },
      createdAt: '2026-08-02T10:00:00Z',
      id: 'comment-1',
      isInternal: true,
      text: 'Interne fachliche Prüfung läuft.',
    })
  })

  it('keeps removed-image audit metadata outside the shared media asset', () => {
    expect(
      mapTicketImageResponse({
        height: 720,
        id: 'image-1',
        is_active: false,
        is_cover: false,
        mime_type: 'image/jpeg',
        original_filename: 'schlagloch.jpg',
        removed_at: '2026-08-03T08:00:00Z',
        size_bytes: 1200,
        ticket_id: 'ticket-1',
        uploaded_at: '2026-08-02T08:00:00Z',
        url: '/api/v1/tickets/ticket-1/images/image-1/content',
        width: 1280,
      }),
    ).toEqual({
      asset: {
        altText: null,
        height: 720,
        id: 'image-1',
        isCover: false,
        mimeType: 'image/jpeg',
        originalFilename: 'schlagloch.jpg',
        sizeBytes: 1200,
        uploadedAt: '2026-08-02T08:00:00Z',
        url: '/api/v1/tickets/ticket-1/images/image-1/content',
        width: 1280,
      },
      isActive: false,
      removedAt: '2026-08-03T08:00:00Z',
    })
  })
})
