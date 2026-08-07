import { useInfiniteQuery } from '@tanstack/react-query'

import { TICKET_READ_ERROR_MESSAGES } from '@/features/tickets/model/ticket-error-messages'
import { ticketEventRendererRegistry } from '@/features/tickets/model/ticket-event-renderers'
import { createTicketEventsInfiniteQueryOptions } from '@/features/tickets/queries/ticket-queries'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import { EventTimeline } from '@/shared/resource-detail/EventTimeline'

/** Loads and presents the append-only event stream without deriving current state. */
export function TicketEventTimeline({ ticketId }: Readonly<{ ticketId: string }>) {
  const query = useInfiniteQuery(createTicketEventsInfiniteQueryOptions(ticketId))

  return (
    <RemoteDataBoundary
      errorOptions={{
        fallback: {
          description:
            'Die Ereignishistorie konnte nicht geladen werden. Der aktuelle Ticketstand bleibt weiterhin verfügbar.',
          title: 'Ereignishistorie nicht verfügbar',
        },
        messagesByErrorCode: TICKET_READ_ERROR_MESSAGES,
      }}
      loadingLabel="Ereignishistorie wird geladen."
      query={query}
    >
      {(data) => {
        const events = data.pages
          .flatMap((page) => page.items)
          .sort((left, right) => right.sequenceNumber - left.sequenceNumber)
        const total = data.pages[0]?.totalItems ?? events.length

        return (
          <EventTimeline
            emptyMessage="Für dieses Ticket wurden noch keine Ereignisse erfasst."
            events={events}
            hasOlderEvents={query.hasNextPage}
            isLoadingOlder={query.isFetchingNextPage}
            loadOlderLabel="Ältere Ereignisse laden"
            onLoadOlder={() => void query.fetchNextPage()}
            registry={ticketEventRendererRegistry}
            total={total}
          />
        )
      }}
    </RemoteDataBoundary>
  )
}
