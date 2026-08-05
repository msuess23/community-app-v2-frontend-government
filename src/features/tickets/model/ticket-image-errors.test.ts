import { ApiError } from '@/api/client/api-error'
import { describe, expect, it } from 'vitest'

import {
  getTicketImageErrorPresentation,
  getTicketImageUploadErrorMessage,
} from '@/features/tickets/model/ticket-image-errors'

describe('ticket image errors', () => {
  it('localizes completed-ticket conflicts', () => {
    const error = new ApiError({
      errorCode: 'TICKET_COMPLETED',
      message: 'technical backend message',
      status: 409,
    })

    expect(getTicketImageErrorPresentation(error)).toEqual({
      description:
        'Bei einem abgeschlossenen Ticket können keine Bilder mehr geändert werden.',
      title: 'Ticket bereits abgeschlossen',
    })
  })

  it('creates compact per-file queue feedback', () => {
    const error = new ApiError({
      errorCode: 'UNSUPPORTED_TICKET_IMAGE_TYPE',
      message: 'technical backend message',
      status: 422,
    })

    expect(getTicketImageUploadErrorMessage(error)).toContain(
      'Dateityp nicht unterstützt',
    )
  })
})
