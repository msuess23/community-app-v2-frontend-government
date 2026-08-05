import { useQuery } from '@tanstack/react-query'
import { Building2, MapPin, UserRound } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'

import {
  TicketCategoryBadge,
  TicketStatusBadge,
  TicketVisibilityBadge,
  TicketWorkflowStateBadge,
} from '@/features/tickets/components/TicketBadges'
import { TicketComments } from '@/features/tickets/components/TicketComments'
import { TicketEventTimeline } from '@/features/tickets/components/TicketEventTimeline'
import { TicketImages } from '@/features/tickets/components/TicketImages'
import { TicketWorkflowActions } from '@/features/tickets/components/TicketWorkflowActions'
import { TICKET_READ_ERROR_MESSAGES } from '@/features/tickets/model/ticket-error-messages'
import type {
  TicketAddress,
  TicketRecord,
  TicketUserReference,
} from '@/features/tickets/model/ticket-model'
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
          aside={<TicketDetailAside ticket={ticket} />}
          backLink={{ label: 'Zurück zum Ticketverzeichnis', to: returnTo }}
          description="Aktueller, vom Backend berechneter Arbeitsstand des Tickets."
          eyebrow={<TicketCategoryBadge category={ticket.category} />}
          navigationClassName="xl:hidden"
          navigationItems={DETAIL_NAVIGATION}
          status={
            <div className="flex flex-wrap gap-2">
              <TicketWorkflowStateBadge state={ticket.workflowState} />
              <TicketStatusBadge status={ticket.currentStatus?.status ?? null} />
              <TicketVisibilityBadge visibility={ticket.visibility} />
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
            <TicketImages ticketId={ticket.id} />
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

function TicketDetailAside({ ticket }: Readonly<{ ticket: TicketRecord }>) {
  return (
    <>
      <ResourceDetailSection
        description="Das Backend berechnet die verfügbaren Aktionen aus Rolle, Zuständigkeit und aktuellem Workflowzustand."
        id="workflow-actions"
        title="Workflowaktionen"
        variant="outlined"
      >
        <TicketWorkflowActions ticket={ticket} />
      </ResourceDetailSection>

      <ResourceDetailSection
        id="responsibility"
        title="Aktuelle Zuständigkeit"
        variant="outlined"
      >
        <div className="space-y-5">
          <TicketOfficeView ticket={ticket} />
          <div className="flex gap-2">
            <UserRound aria-hidden="true" className="mt-1 shrink-0" size={18} />
            <ResourceMetadataList
              className="min-w-0 flex-1 sm:grid-cols-1 xl:grid-cols-1"
              items={[
                {
                  label: 'Erstellt von',
                  value: <TicketUserReferenceView user={ticket.creator} />,
                },
                {
                  label: 'Primärer Bearbeiter',
                  value: (
                    <TicketUserReferenceView user={ticket.primaryOfficer} />
                  ),
                },
                {
                  label: 'Aktueller Bearbeiter',
                  value: (
                    <TicketUserReferenceView user={ticket.currentAssignee} />
                  ),
                },
                {
                  label: 'Rückgabeziel',
                  value: <TicketUserReferenceView user={ticket.returnToUser} />,
                },
              ]}
            />
          </div>
        </div>
      </ResourceDetailSection>

      <ResourceDetailSection id="metadata" title="Metadaten" variant="subtle">
        <ResourceMetadataList
          className="sm:grid-cols-1 xl:grid-cols-1"
          items={[
            {
              label: 'Erstellt am',
              value: (
                <time dateTime={ticket.createdAt}>
                  {formatDisplayDateTime(ticket.createdAt)}
                </time>
              ),
            },
            {
              label: 'Zuletzt geändert',
              value: (
                <time dateTime={ticket.updatedAt}>
                  {formatDisplayDateTime(ticket.updatedAt)}
                </time>
              ),
            },
            { label: 'Version', value: String(ticket.version) },
            {
              label: 'Sichtbarkeit',
              value: <TicketVisibilityBadge visibility={ticket.visibility} />,
            },
          ]}
        />
      </ResourceDetailSection>
    </>
  )
}

function TicketOfficeView({ ticket }: Readonly<{ ticket: TicketRecord }>) {
  return (
    <div className="flex gap-2">
      <Building2 aria-hidden="true" className="mt-1 shrink-0" size={18} />
      <div>
        <p className="text-on-surface-variant text-sm font-medium">Behörde</p>
        {ticket.office ? (
          <Link
            className="text-primary focus-visible:outline-primary mt-1 inline-block rounded-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
            to={`/offices/${ticket.office.id}`}
          >
            {ticket.office.name}
          </Link>
        ) : (
          <p className="mt-1">Noch nicht zugeordnet</p>
        )}
      </div>
    </div>
  )
}

function TicketUserReferenceView({
  user,
}: Readonly<{ user: TicketUserReference | null }>) {
  return <span>{user?.displayName ?? 'Nicht zugewiesen'}</span>
}

function TicketAddressView({
  address,
}: Readonly<{ address: TicketAddress | null }>) {
  if (!address) {
    return <p className="text-on-surface-variant">Keine Adresse hinterlegt.</p>
  }

  return (
    <address className="flex gap-2 not-italic">
      <MapPin aria-hidden="true" className="mt-1 shrink-0" size={18} />
      <span className="grid gap-1">
        <span>
          {address.street} {address.houseNumber}
        </span>
        <span>
          {address.zipCode} {address.city}
        </span>
      </span>
    </address>
  )
}
