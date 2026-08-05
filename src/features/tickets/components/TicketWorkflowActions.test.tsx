import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { TicketWorkflowAction } from '@/api/generated/models'
import { TicketWorkflowActions } from '@/features/tickets/components/TicketWorkflowActions'
import type { TicketRecord } from '@/features/tickets/model/ticket-model'
import { renderWithProviders } from '@/test/render'

const ALL_TICKET_WORKFLOW_ACTIONS = [
  'DISPATCH',
  'ASSIGN_PRIMARY_OFFICER',
  'REASSIGN_PRIMARY_OFFICER',
  'FORWARD',
  'REQUEST_COSIGNATURE',
  'COSIGN',
  'ESCALATE',
  'DECIDE_ESCALATION',
  'REQUEST_CITIZEN_RESPONSE',
  'RETURN_TO_DISPATCH',
  'COMPLETE',
] as const satisfies readonly TicketWorkflowAction[]

const ACTION_LABELS = [
  'Behörde zuordnen',
  'Primär zuweisen',
  'Primär ersetzen',
  'Weiterleiten',
  'Mitzeichnung',
  'Mitzeichnen',
  'Eskalieren',
  'Eskalation entscheiden',
  'Bürgerantwort',
  'Zurückgeben',
  'Abschließen',
] as const

describe('TicketWorkflowActions', () => {
  it('registers every action exposed by the backend workflow contract', () => {
    renderWithProviders(
      <TicketWorkflowActions
        ticket={createTicket(ALL_TICKET_WORKFLOW_ACTIONS)}
      />,
    )

    for (const label of ACTION_LABELS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('renders no locally inferred action when the backend permits none', () => {
    renderWithProviders(<TicketWorkflowActions ticket={createTicket([])} />)

    expect(
      screen.getByText(
        'Für deinen aktuellen Zuständigkeitsbereich und diesen Ticketstand sind keine Workflowaktionen verfügbar.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

function createTicket(
  allowedActions: readonly TicketWorkflowAction[],
): TicketRecord {
  return {
    address: null,
    allowedActions,
    canManageImages: false,
    category: 'INFRASTRUCTURE',
    createdAt: '2026-08-01T08:00:00Z',
    creator: { displayName: 'Clara Bürgerin', id: 'citizen-1' },
    currentAssignee: { displayName: 'Olaf Ordnung', id: 'officer-1' },
    currentStatus: null,
    description: null,
    id: 'ticket-1',
    imageUrl: null,
    office: { id: 'office-1', name: 'Tiefbauamt' },
    primaryOfficer: { displayName: 'Olaf Ordnung', id: 'officer-1' },
    returnToUser: null,
    title: 'Schlagloch in der Parkstraße',
    updatedAt: '2026-08-02T09:30:00Z',
    version: 4,
    visibility: 'PUBLIC',
    workflowState: 'IN_PROGRESS',
  }
}
