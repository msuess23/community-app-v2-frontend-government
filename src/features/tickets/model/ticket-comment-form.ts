import type { UseFormSetError } from 'react-hook-form'
import { z } from 'zod'

import type { TicketCommentCreateRequest } from '@/api/generated/models'
import { applySubmissionError } from '@/shared/forms/apply-submission-error'

export const TICKET_COMMENT_MAX_LENGTH = 2000

export const ticketCommentFormSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Gib einen Kommentar oder eine interne Notiz ein.')
    .max(
      TICKET_COMMENT_MAX_LENGTH,
      `Der Text darf höchstens ${TICKET_COMMENT_MAX_LENGTH} Zeichen enthalten.`,
    ),
  visibility: z.enum(['INTERNAL', 'PUBLIC']),
})

export type TicketCommentFormValues = z.infer<typeof ticketCommentFormSchema>

/** Creates a safe staff-side default that does not publish text accidentally. */
export function createTicketCommentFormValues(): TicketCommentFormValues {
  return { text: '', visibility: 'INTERNAL' }
}

/** Maps the feature-owned form values to the append-only comment command. */
export function mapTicketCommentFormToRequest(
  values: TicketCommentFormValues,
): TicketCommentCreateRequest {
  return {
    is_internal: values.visibility === 'INTERNAL',
    text: values.text.trim(),
  }
}

/** Maps backend validation details without surfacing technical response text. */
export function applyTicketCommentSubmissionError(
  error: unknown,
  setError: UseFormSetError<TicketCommentFormValues>,
) {
  return applySubmissionError(error, setError, {
    fallbackMessage:
      'Der Kommentar konnte nicht gespeichert werden. Prüfe deine Eingaben und versuche es erneut.',
    fieldAliases: {
      is_internal: 'visibility',
      text: 'text',
    },
    statusMessages: {
      403: 'Du darfst für dieses Ticket keine Kommentare erfassen.',
      404: 'Das Ticket ist nicht mehr verfügbar.',
      409: 'Der Ticketstand hat sich geändert. Lade die Seite neu und versuche es erneut.',
    },
  })
}
