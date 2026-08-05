import { describe, expect, it } from 'vitest'

import {
  getTicketCategoryLabel,
  getTicketCurrentResponsibilityLabel,
  getTicketStatusLabel,
  getTicketVisibilityLabel,
  getTicketWorkflowStateLabel,
  type TicketRecord,
} from '@/features/tickets/model/ticket-model'

describe('ticket labels', () => {
  it('localizes every read-model enum used by the workspace', () => {
    expect(getTicketCategoryLabel('INFRASTRUCTURE')).toBe('Infrastruktur')
    expect(getTicketStatusLabel('RESOLVED')).toBe('Erledigt')
    expect(getTicketVisibilityLabel('PRIVATE')).toBe('Nicht öffentlich')
    expect(getTicketWorkflowStateLabel('RETURNED_TO_DISPATCH')).toBe(
      'An Disposition zurückgegeben',
    )
  })

  it('prefers the current assignee over the permanent responsibility', () => {
    const ticket = {
      currentAssignee: { displayName: 'Aktuelle Person', id: 'current' },
      primaryOfficer: { displayName: 'Primäre Person', id: 'primary' },
    } as unknown as TicketRecord

    expect(getTicketCurrentResponsibilityLabel(ticket)).toBe('Aktuelle Person')
  })

  it('describes unassigned states by their actual workflow responsibility', () => {
    expect(
      getTicketCurrentResponsibilityLabel({
        currentAssignee: null,
        primaryOfficer: null,
        workflowState: 'RETURNED_TO_DISPATCH',
      } as unknown as TicketRecord),
    ).toBe('Disposition')
    expect(
      getTicketCurrentResponsibilityLabel({
        currentAssignee: null,
        primaryOfficer: null,
        workflowState: 'AWAITING_PRIMARY_ASSIGNMENT',
      } as unknown as TicketRecord),
    ).toBe('Primärzuweisung offen')
    expect(
      getTicketCurrentResponsibilityLabel({
        currentAssignee: null,
        primaryOfficer: null,
        workflowState: 'COMPLETED',
      } as unknown as TicketRecord),
    ).toBe('Keine aktive Bearbeitung')
  })
})
