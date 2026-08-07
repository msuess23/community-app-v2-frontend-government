import { Building2, MapPin, UserRound } from 'lucide-react'
import { Link } from 'react-router'

import { TicketVisibilityBadge } from '@/features/tickets/components/TicketBadges'
import { TicketWorkflowActions } from '@/features/tickets/components/TicketWorkflowActions'
import type {
  TicketAddress,
  TicketRecord,
  TicketUserReference,
} from '@/features/tickets/model/ticket-model'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import {
  ResourceDetailSection,
  ResourceMetadataList,
} from '@/shared/resource-detail/ResourceDetailLayout'

/** Groups workflow actions, responsibility and projection metadata in the detail aside. */
export function TicketDetailSummary({
  ticket,
}: Readonly<{ ticket: TicketRecord }>) {
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
          <TicketOfficeReferenceView ticket={ticket} />
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

/** Presents an optional ticket address without exposing coordinate-only details. */
export function TicketAddressView({
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

function TicketOfficeReferenceView({
  ticket,
}: Readonly<{ ticket: TicketRecord }>) {
  return (
    <div className="flex gap-2">
      <Building2 aria-hidden="true" className="mt-1 shrink-0" size={18} />
      <div>
        <p className="text-on-surface-variant text-sm font-medium">Behörde</p>
        {ticket.office ? (
          <Link
            className="text-primary focus-visible:outline-primary mt-1 inline-flex min-h-11 items-center rounded-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
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
