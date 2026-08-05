import type { ListInternalTicketsApiV1TicketsInternalGetParams } from '@/api/generated/models'
import { createResourceQueryKeys } from '@/shared/remote-data/query-keys'

const baseTicketQueryKeys = createResourceQueryKeys<
  ListInternalTicketsApiV1TicketsInternalGetParams,
  string
>('ticket-feature')

/** Owns internal ticket projections and their separately loaded related resources. */
export const ticketFeatureQueryKeys = {
  ...baseTicketQueryKeys,
  comments: (ticketId: string) =>
    baseTicketQueryKeys.related(ticketId, 'comments'),
  events: (ticketId: string) =>
    baseTicketQueryKeys.related(ticketId, 'events'),
  images: (ticketId: string, includeRemoved = false) =>
    baseTicketQueryKeys.related(ticketId, 'images', { includeRemoved }),
  workflowOptions: (ticketId: string) =>
    baseTicketQueryKeys.related(ticketId, 'workflow-options'),
}
