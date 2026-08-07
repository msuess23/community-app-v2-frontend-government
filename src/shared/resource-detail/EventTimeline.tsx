import { Clock3, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'

import { DataViewStatusBadge } from '@/shared/data-view/DataViewStatusBadge'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import {
  resolveResourceEventPresentation,
  type ResourceEvent,
  type ResourceEventPresentation,
  type ResourceEventRendererRegistry,
} from '@/shared/resource-detail/event-renderer-registry'
import { Button } from '@/shared/ui/Button'

export interface EventTimelineProps<TEvent extends ResourceEvent> {
  emptyMessage?: ReactNode
  events: ReadonlyArray<TEvent>
  hasOlderEvents?: boolean
  isLoadingOlder?: boolean
  loadOlderLabel?: string
  onLoadOlder?: () => void
  registry: ResourceEventRendererRegistry<TEvent>
  showDevelopmentDetails?: boolean
  total?: number
}

/** Displays immutable events in the exact order supplied by the backend projection. */
export function EventTimeline<TEvent extends ResourceEvent>({
  emptyMessage = 'Für diese Ressource wurden noch keine Ereignisse erfasst.',
  events,
  hasOlderEvents = false,
  isLoadingOlder = false,
  loadOlderLabel = 'Ältere Ereignisse laden',
  onLoadOlder,
  registry,
  showDevelopmentDetails = import.meta.env.DEV,
  total,
}: EventTimelineProps<TEvent>) {
  if (events.length === 0) {
    return <p className="text-on-surface-variant leading-7">{emptyMessage}</p>
  }

  return (
    <div className="space-y-5">
      {typeof total === 'number' ? (
        <p
          aria-atomic="true"
          className="text-on-surface-variant text-sm"
          role="status"
        >
          {events.length} von {total} Ereignissen angezeigt
        </p>
      ) : null}

      <ol className="relative space-y-0">
        {events.map((event, index) => (
          <EventTimelineItem
            event={event}
            isLast={index === events.length - 1}
            key={event.id}
            registry={registry}
            showDevelopmentDetails={showDevelopmentDetails}
          />
        ))}
      </ol>

      {hasOlderEvents && onLoadOlder ? (
        <div className="border-outline-variant flex justify-center border-t pt-5">
          <Button
            aria-busy={isLoadingOlder || undefined}
            isDisabled={isLoadingOlder}
            onPress={onLoadOlder}
            variant="outline"
          >
            {isLoadingOlder
              ? 'Ältere Ereignisse werden geladen …'
              : loadOlderLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

interface EventTimelineItemProps<TEvent extends ResourceEvent> {
  event: TEvent
  isLast: boolean
  registry: ResourceEventRendererRegistry<TEvent>
  showDevelopmentDetails: boolean
}

/** Renders one append-only event with sequence, actor and feature-owned semantics. */
function EventTimelineItem<TEvent extends ResourceEvent>({
  event,
  isLast,
  registry,
  showDevelopmentDetails,
}: EventTimelineItemProps<TEvent>) {
  const presentation =
    resolveResourceEventPresentation(event, registry) ??
    createUnknownEventPresentation(event)
  const occurredAtLabel = formatDisplayDateTime(event.occurredAt)
  const isUnknown = !registry.has(event.eventType)

  return (
    <li className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-4">
      <div aria-hidden="true" className="relative flex justify-center">
        {!isLast ? (
          <span className="bg-outline-variant absolute top-5 bottom-0 w-px" />
        ) : null}
        <span className="border-primary bg-surface-container-lowest relative mt-1.5 h-3.5 w-3.5 rounded-full border-2" />
      </div>

      <article className="min-w-0 pb-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-on-surface font-semibold">
                {presentation.title}
              </h3>
              <DataViewStatusBadge tone={presentation.tone ?? 'neutral'}>
                Ereignis #{event.sequenceNumber}
              </DataViewStatusBadge>
            </div>
            {presentation.description ? (
              <div className="text-on-surface-variant max-w-3xl leading-7">
                {presentation.description}
              </div>
            ) : null}
          </div>

          <time
            className="text-on-surface-variant inline-flex shrink-0 items-center gap-1.5 text-sm"
            dateTime={event.occurredAt}
          >
            <Clock3 aria-hidden="true" size={16} />
            {occurredAtLabel}
          </time>
        </div>

        {event.actor ? (
          <p className="text-on-surface-variant mt-3 inline-flex items-center gap-1.5 text-sm">
            <UserRound aria-hidden="true" size={16} />
            Ausgeführt von {event.actor.label}
          </p>
        ) : null}

        {presentation.details ? (
          <div className="border-outline-variant mt-4 border-l-2 pl-4 leading-7">
            {presentation.details}
          </div>
        ) : null}

        {isUnknown && showDevelopmentDetails ? (
          <DevelopmentEventDetails event={event} />
        ) : null}
      </article>
    </li>
  )
}

/** Creates a safe production fallback when a newer backend event is not rendered yet. */
function createUnknownEventPresentation(
  event: ResourceEvent,
): ResourceEventPresentation {
  return {
    description:
      'Für diesen Ereignistyp ist noch keine fachliche Darstellung hinterlegt.',
    title: `Unbekanntes Ereignis: ${event.eventType}`,
    tone: 'warning',
  }
}

/** Exposes raw payload only in an explicit development context for renderer work. */
function DevelopmentEventDetails({
  event,
}: Readonly<{ event: ResourceEvent }>) {
  return (
    <details className="border-outline-variant bg-surface-container mt-4 rounded-lg border p-3">
      <summary className="cursor-pointer font-semibold">
        Entwicklungsdetails anzeigen
      </summary>
      <pre className="mt-3 overflow-x-auto text-xs leading-5 whitespace-pre-wrap">
        {serializeEventPayload(event.payload)}
      </pre>
    </details>
  )
}

/** Serializes diagnostic payload without allowing a malformed value to break the timeline. */
function serializeEventPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload, null, 2) ?? String(payload)
  } catch {
    return '[Payload konnte nicht serialisiert werden]'
  }
}
