import { z } from 'zod'

export const TICKET_IMAGE_REMOVAL_REASON_MAX_LENGTH = 500

export const ticketImageRemovalSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(
      TICKET_IMAGE_REMOVAL_REASON_MAX_LENGTH,
      `Die Begründung darf höchstens ${TICKET_IMAGE_REMOVAL_REASON_MAX_LENGTH} Zeichen enthalten.`,
    ),
})

export type TicketImageRemovalFormValues = z.infer<
  typeof ticketImageRemovalSchema
>

export function createTicketImageRemovalValues(): TicketImageRemovalFormValues {
  return { reason: '' }
}

export function normalizeTicketImageRemovalReason(
  value: string,
): string | null {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized || null
}
