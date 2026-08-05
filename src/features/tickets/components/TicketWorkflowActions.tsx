import {
  BadgeCheck,
  Building2,
  CircleCheckBig,
  Forward,
  MessageCircleQuestion,
  RefreshCw,
  Scale,
  Undo2,
  UserPlus,
  Users,
} from 'lucide-react'
import { useMemo } from 'react'

import type { TicketWorkflowAction } from '@/features/tickets/model/ticket-workflow'
import { TicketWorkflowForm } from '@/features/tickets/components/TicketWorkflowForms'
import type { TicketRecord } from '@/features/tickets/model/ticket-model'
import { ResourceActionBar } from '@/shared/resource-detail/ResourceActionBar'
import { createResourceActionRegistry } from '@/shared/resource-detail/resource-action-registry'

/** Renders exactly the ticket commands exposed by the current backend projection. */
export function TicketWorkflowActions({
  ticket,
}: Readonly<{ ticket: TicketRecord }>) {
  const registry = useMemo(
    () =>
      createResourceActionRegistry<TicketWorkflowAction>([
        {
          action: 'DISPATCH',
          description:
            'Ordne das Ticket einer aktiven Behörde zu. Die Behörde kann anschließend einen primären Bearbeiter bestimmen.',
          dialogTitle: 'Ticket einer Behörde zuordnen',
          icon: <Building2 aria-hidden="true" size={18} />,
          label: 'Behörde zuordnen',
          render: ({ action }) => (
            <TicketWorkflowForm action={action} ticket={ticket} />
          ),
        },
        {
          action: 'ASSIGN_PRIMARY_OFFICER',
          description:
            'Bestimme den dauerhaft fachlich verantwortlichen Officer der zugeordneten Behörde.',
          dialogTitle: 'Primären Bearbeiter zuweisen',
          icon: <UserPlus aria-hidden="true" size={18} />,
          label: 'Primär zuweisen',
          render: ({ action }) => (
            <TicketWorkflowForm action={action} ticket={ticket} />
          ),
        },
        {
          action: 'REASSIGN_PRIMARY_OFFICER',
          description:
            'Ersetze die dauerhafte fachliche Verantwortung durch einen anderen aktiven Officer derselben Behörde.',
          dialogTitle: 'Primären Bearbeiter ersetzen',
          icon: <RefreshCw aria-hidden="true" size={18} />,
          label: 'Primär ersetzen',
          render: ({ action }) => (
            <TicketWorkflowForm action={action} ticket={ticket} />
          ),
        },
        {
          action: 'FORWARD',
          description:
            'Übertrage die aktuelle Koordination an einen anderen Officer oder Manager. Die primäre Verantwortung bleibt unverändert.',
          dialogTitle: 'Ticket weiterleiten',
          icon: <Forward aria-hidden="true" size={18} />,
          label: 'Weiterleiten',
          render: ({ action }) => (
            <TicketWorkflowForm action={action} ticket={ticket} />
          ),
        },
        {
          action: 'REQUEST_COSIGNATURE',
          description:
            'Bitte eine andere Person um eine vorübergehende Mitzeichnung. Danach kehrt das Ticket automatisch zurück.',
          dialogTitle: 'Mitzeichnung anfordern',
          icon: <Users aria-hidden="true" size={18} />,
          label: 'Mitzeichnung',
          render: ({ action }) => (
            <TicketWorkflowForm action={action} ticket={ticket} />
          ),
        },
        {
          action: 'COSIGN',
          description:
            'Dokumentiere die angeforderte Mitzeichnung und gib das Ticket an die vorherige Bearbeitung zurück.',
          dialogTitle: 'Ticket mitzeichnen',
          icon: <BadgeCheck aria-hidden="true" size={18} />,
          label: 'Mitzeichnen',
          render: ({ action }) => (
            <TicketWorkflowForm action={action} ticket={ticket} />
          ),
        },
        {
          action: 'ESCALATE',
          description:
            'Fordere eine Managemententscheidung an. Bis zur Entscheidung pausiert die bisherige Bearbeitung.',
          dialogTitle: 'Ticket eskalieren',
          icon: <Scale aria-hidden="true" size={18} />,
          label: 'Eskalieren',
          render: ({ action }) => (
            <TicketWorkflowForm action={action} ticket={ticket} />
          ),
        },
        {
          action: 'DECIDE_ESCALATION',
          description:
            'Genehmige oder lehne die eskalierte Vorgehensweise ab. Das Ticket kehrt danach zur vorherigen Bearbeitung zurück.',
          dialogTitle: 'Eskalation entscheiden',
          icon: <Scale aria-hidden="true" size={18} />,
          label: 'Eskalation entscheiden',
          render: ({ action }) => (
            <TicketWorkflowForm action={action} ticket={ticket} />
          ),
        },
        {
          action: 'REQUEST_CITIZEN_RESPONSE',
          description:
            'Stelle dem Ersteller eine öffentliche Rückfrage. Die Bearbeitung wartet anschließend auf die Antwort.',
          dialogTitle: 'Bürgerantwort anfordern',
          icon: <MessageCircleQuestion aria-hidden="true" size={18} />,
          label: 'Bürgerantwort',
          render: ({ action }) => (
            <TicketWorkflowForm action={action} ticket={ticket} />
          ),
        },
        {
          action: 'RETURN_TO_DISPATCH',
          buttonVariant: 'danger',
          description:
            'Gib ein falsch zugeordnetes Ticket an die zentrale Disposition zurück. Zuständigkeiten werden zurückgesetzt.',
          dialogTitle: 'Ticket zur Disposition zurückgeben',
          icon: <Undo2 aria-hidden="true" size={18} />,
          label: 'Zurückgeben',
          render: ({ action }) => (
            <TicketWorkflowForm action={action} ticket={ticket} />
          ),
        },
        {
          action: 'COMPLETE',
          description:
            'Schließe den Workflow mit einem öffentlich sichtbaren Resultat und einer verständlichen Abschlussnachricht ab.',
          dialogTitle: 'Ticket abschließen',
          icon: <CircleCheckBig aria-hidden="true" size={18} />,
          label: 'Abschließen',
          render: ({ action }) => (
            <TicketWorkflowForm action={action} ticket={ticket} />
          ),
        },
      ]),
    [ticket],
  )

  return (
    <ResourceActionBar
      allowedActions={ticket.allowedActions}
      ariaLabel="Verfügbare Ticketaktionen"
      emptyMessage="Für deinen aktuellen Zuständigkeitsbereich und diesen Ticketstand sind keine Workflowaktionen verfügbar."
      registry={registry}
    />
  )
}
