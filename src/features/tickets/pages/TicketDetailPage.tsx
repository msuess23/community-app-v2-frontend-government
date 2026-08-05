import { useQuery } from '@tanstack/react-query'
import { useLocation, useParams } from 'react-router'

import {
  TicketCategoryBadge,
  TicketStatusBadge,
  TicketVisibilityBadge,
  TicketWorkflowStateBadge,
} from '@/features/tickets/components/TicketBadges'
import { TicketComments } from '@/features/tickets/components/TicketComments'
import {
  TicketAddressView,
  TicketDetailSummary,
} from '@/features/tickets/components/TicketDetailSummary'
import { TicketEventTimeline } from '@/features/tickets/components/TicketEventTimeline'
import { TicketImages } from '@/features/tickets/components/TicketImages'
import { TICKET_READ_ERROR_MESSAGES } from '@/features/tickets/model/ticket-error-messages'
import { createTicketDetailQueryOptions } from '@/features/tickets/queries/ticket-queries'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import {
  ResourceDetailLayout,
  ResourceDetailSection,
  ResourceMetadataList,
} from '@/shared/resource-detail/ResourceDetailLayout'
import { resolveResourceDetailReturnTo } from '@/shared/resource-detail/detail-navigation'

const DETAIL_NAVIGATION = [
  { id: 'workflow-actions', label: 'Aktionen' },
  { id: 'description', label: 'Beschreibung' },
  { id: 'current-status', label: 'Aktueller Status' },
  { id: 'address', label: 'Adresse' },
  { id: 'images', label: 'Bilder' },
  { id: 'comments', label: 'Kommentare' },
  { id: 'event-history', label: 'Ereignishistorie' },
  { id: 'responsibility', label: 'Zuständigkeit' },
  { id: 'metadata', label: 'Metadaten' },
] as const

/** Shows the current server-owned ticket projection without replaying its events. */
export function TicketDetailPage() {
  const { ticketId = '' } = useParams()
  const location = useLocation()
  const ticketQuery = useQuery({
    ...createTicketDetailQueryOptions(ticketId),
    enabled: ticketId.length > 0,
  })
  const returnTo = resolveResourceDetailReturnTo(location.state, '/tickets')

  return (
    <RemoteDataBoundary
      errorOptions={{
        fallback: {
          description: 'Das Ticket konnte nicht geladen werden. Versuche es erneut.',
          title: 'Ticket nicht verfügbar',
        },
        messagesByErrorCode: TICKET_READ_ERROR_MESSAGES,
      }}
      loadingLabel="Ticket wird geladen."
      query={ticketQuery}
    >
      {(ticket) => (
        <ResourceDetailLayout
          aside={<TicketDetailSummary ticket={ticket} />}
          backLink={{ label: 'Zurück zum Ticketverzeichnis', to: returnTo }}
          description="Aktueller, vom Backend berechneter Arbeitsstand des Tickets."
          eyebrow={<TicketCategoryBadge category={ticket.category} />}
          navigationClassName="xl:hidden"
          navigationItems={DETAIL_NAVIGATION}
          status={
            <div>
              <div className="flex flex-wrap gap-2">
                <TicketWorkflowStateBadge state={ticket.workflowState} />
                <TicketStatusBadge
                  status={ticket.currentStatus?.status ?? null}
                />
                <TicketVisibilityBadge visibility={ticket.visibility} />
              </div>
              <p aria-live="polite" className="sr-only" role="status">
                Ticketstand Version {ticket.version}, zuletzt geändert{' '}
                {formatDisplayDateTime(ticket.updatedAt)}.
              </p>
            </div>
          }
          title={ticket.title}
        >
          <ResourceDetailSection id="description" title="Beschreibung">
            <p className="text-on-surface-variant whitespace-pre-wrap leading-7">
              {ticket.description ?? 'Keine Beschreibung hinterlegt.'}
            </p>
          </ResourceDetailSection>

          <ResourceDetailSection
            description="Der öffentliche Status und der interne Workflowzustand werden unabhängig voneinander vom Backend geführt."
            id="current-status"
            title="Aktueller Status"
          >
            <ResourceMetadataList
              items={[
                {
                  label: 'Workflowzustand',
                  value: (
                    <TicketWorkflowStateBadge state={ticket.workflowState} />
                  ),
                },
                {
                  label: 'Öffentlicher Status',
                  value: (
                    <TicketStatusBadge
                      status={ticket.currentStatus?.status ?? null}
                    />
                  ),
                },
              ]}
            />
            <div className="border-outline-variant mt-5 border-t pt-5">
              <h3 className="font-semibold">Öffentliche Statusnachricht</h3>
              <p className="text-on-surface-variant mt-2 whitespace-pre-wrap leading-7">
                {ticket.currentStatus?.message ??
                  'Keine öffentliche Statusnachricht hinterlegt.'}
              </p>
            </div>
          </ResourceDetailSection>

          <ResourceDetailSection id="address" title="Adresse">
            <TicketAddressView address={ticket.address} />
          </ResourceDetailSection>

          <ResourceDetailSection
            description="Aktive Bilder stammen aus der aktuellen Bildprojektion. Officer und Manager sehen zusätzlich historisch entfernte Revisionen."
            id="images"
            title="Bilder"
          >
            <TicketImages
              canManageImages={ticket.canManageImages}
              ticketId={ticket.id}
            />
          </ResourceDetailSection>

          <ResourceDetailSection
            description="Öffentliche Kommentare und interne Bearbeitungsnotizen werden unveränderlich als Ticketereignisse gespeichert."
            id="comments"
            title="Kommentare und interne Notizen"
          >
            <TicketComments ticketId={ticket.id} />
          </ResourceDetailSection>

          <ResourceDetailSection
            description="Chronologische, unveränderliche Ereignisse des Tickets. Der aktuelle Zustand oben wird weiterhin direkt aus der Backend-Projektion gelesen."
            id="event-history"
            title="Ereignishistorie"
          >
            <TicketEventTimeline ticketId={ticket.id} />
          </ResourceDetailSection>
        </ResourceDetailLayout>
      )}
    </RemoteDataBoundary>
  )
}
