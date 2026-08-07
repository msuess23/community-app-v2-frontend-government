import { useInfiniteQuery } from '@tanstack/react-query'

import { appointmentEventRendererRegistry } from '@/features/appointments/model/appointment-event-renderers'
import { APPOINTMENT_READ_ERROR_MESSAGES } from '@/features/appointments/model/appointment-error-messages'
import { createAppointmentEventsInfiniteQueryOptions } from '@/features/appointments/queries/appointment-queries'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import { EventTimeline } from '@/shared/resource-detail/EventTimeline'

/** Loads and presents the immutable appointment stream without deriving current state. */
export function AppointmentEventTimeline({
  appointmentId,
}: Readonly<{ appointmentId: string }>) {
  const query = useInfiniteQuery(
    createAppointmentEventsInfiniteQueryOptions(appointmentId),
  )

  return (
    <RemoteDataBoundary
      errorOptions={{
        fallback: {
          description:
            'Die Ereignishistorie konnte nicht geladen werden. Der aktuelle Terminstand bleibt weiterhin verfügbar.',
          title: 'Ereignishistorie nicht verfügbar',
        },
        messagesByErrorCode: APPOINTMENT_READ_ERROR_MESSAGES,
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
            emptyMessage="Für diesen Termin wurden noch keine Ereignisse erfasst."
            events={events}
            hasOlderEvents={query.hasNextPage}
            isLoadingOlder={query.isFetchingNextPage}
            loadOlderLabel="Ältere Ereignisse laden"
            onLoadOlder={() => void query.fetchNextPage()}
            registry={appointmentEventRendererRegistry}
            total={total}
          />
        )
      }}
    </RemoteDataBoundary>
  )
}
