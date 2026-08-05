import { describe, expect, it } from 'vitest'

import {
  createTicketCommentFormValues,
  mapTicketCommentFormToRequest,
  ticketCommentFormSchema,
} from '@/features/tickets/model/ticket-comment-form'

describe('ticket comment form', () => {
  it('uses the private staff-safe default', () => {
    expect(createTicketCommentFormValues()).toEqual({
      text: '',
      visibility: 'INTERNAL',
    })
  })

  it('normalizes text and maps explicit public visibility', () => {
    expect(
      mapTicketCommentFormToRequest({
        text: '  Sachstand für alle sichtbar.  ',
        visibility: 'PUBLIC',
      }),
    ).toEqual({
      is_internal: false,
      text: 'Sachstand für alle sichtbar.',
    })
  })

  it('rejects empty and overlong comments', () => {
    expect(
      ticketCommentFormSchema.safeParse({
        text: '   ',
        visibility: 'INTERNAL',
      }).success,
    ).toBe(false)
    expect(
      ticketCommentFormSchema.safeParse({
        text: 'x'.repeat(2001),
        visibility: 'INTERNAL',
      }).success,
    ).toBe(false)
  })
})
