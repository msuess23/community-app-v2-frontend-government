import { keepPreviousData } from '@tanstack/react-query'

import type { ListInternalTicketsApiV1TicketsInternalGetParams } from '@/api/generated/models'
import {
  getInternalTicketApiV1TicketsTicketIdInternalGet,
  listInternalTicketsApiV1TicketsInternalGet,
} from '@/api/generated/tickets/tickets'
import { createMappedQueryOptions } from '@/api/contract/query-options'
import {
  mapTicketInternalDetailResponse,
  mapTicketPage,
} from '@/features/tickets/model/ticket-mapper'
import { ticketFeatureQueryKeys } from '@/features/tickets/queries/ticket-query-keys'

/** Creates the paginated, role-scoped ticket directory query. */
export function createTicketDirectoryQueryOptions(
  params: ListInternalTicketsApiV1TicketsInternalGetParams,
) {
  return createMappedQueryOptions({
    map: mapTicketPage,
    options: { placeholderData: keepPreviousData },
    queryFn: (signal) =>
      listInternalTicketsApiV1TicketsInternalGet(params, { signal }),
    queryKey: ticketFeatureQueryKeys.list(params),
  })
}

/** Creates the query for one current internal ticket projection. */
export function createTicketDetailQueryOptions(ticketId: string) {
  return createMappedQueryOptions({
    map: mapTicketInternalDetailResponse,
    queryFn: (signal) =>
      getInternalTicketApiV1TicketsTicketIdInternalGet(ticketId, { signal }),
    queryKey: ticketFeatureQueryKeys.detail(ticketId),
  })
}
