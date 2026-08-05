import { infiniteQueryOptions, keepPreviousData } from '@tanstack/react-query'

import type {
  ListInternalTicketsApiV1TicketsInternalGetParams,
  TicketCommentResponse,
  TicketImageResponse,
} from '@/api/generated/models'
import {
  getInternalTicketApiV1TicketsTicketIdInternalGet,
  getInternalTicketEventsApiV1TicketsTicketIdEventsGet,
  listInternalTicketsApiV1TicketsInternalGet,
  listTicketCommentsApiV1TicketsTicketIdCommentsGet,
  listTicketImagesApiV1TicketsTicketIdImagesGet,
} from '@/api/generated/tickets/tickets'
import type { PageModel } from '@/api/contract/pagination'
import { createMappedQueryOptions } from '@/api/contract/query-options'
import {
  mapTicketCommentResponse,
  mapTicketImageResponse,
} from '@/features/tickets/model/ticket-collaboration'
import {
  mapTicketEventPage,
  type TicketEventRecord,
} from '@/features/tickets/model/ticket-event'
import {
  mapTicketInternalDetailResponse,
  mapTicketPage,
} from '@/features/tickets/model/ticket-mapper'
import { ticketFeatureQueryKeys } from '@/features/tickets/queries/ticket-query-keys'

const TICKET_EVENT_PAGE_SIZE = 20

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

/** Creates incremental chronological pages for the immutable ticket stream. */
export function createTicketEventsInfiniteQueryOptions(ticketId: string) {
  return infiniteQueryOptions({
    getNextPageParam: (lastPage: PageModel<TicketEventRecord>) =>
      lastPage.page < lastPage.pageCount ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    queryFn: async ({
      pageParam,
      signal,
    }: Readonly<{ pageParam: number; signal: AbortSignal }>) =>
      mapTicketEventPage(
        await getInternalTicketEventsApiV1TicketsTicketIdEventsGet(
          ticketId,
          { page: pageParam, size: TICKET_EVENT_PAGE_SIZE },
          { signal },
        ),
      ),
    queryKey: ticketFeatureQueryKeys.events(ticketId),
  })
}

/** Creates the read-only public-comment and internal-note projection query. */
export function createTicketCommentsQueryOptions(ticketId: string) {
  return createMappedQueryOptions({
    map: (items: TicketCommentResponse[]) =>
      items.map(mapTicketCommentResponse),
    queryFn: (signal) =>
      listTicketCommentsApiV1TicketsTicketIdCommentsGet(ticketId, { signal }),
    queryKey: ticketFeatureQueryKeys.comments(ticketId),
  })
}

/** Creates the role-aware current or historical ticket-image query. */
export function createTicketImagesQueryOptions(
  ticketId: string,
  includeRemoved: boolean,
) {
  return createMappedQueryOptions({
    map: (items: TicketImageResponse[]) => items.map(mapTicketImageResponse),
    queryFn: (signal) =>
      listTicketImagesApiV1TicketsTicketIdImagesGet(
        ticketId,
        { include_removed: includeRemoved },
        { signal },
      ),
    queryKey: ticketFeatureQueryKeys.images(ticketId, includeRemoved),
  })
}
