import type {
  TicketCategory,
  TicketStatus,
  TicketVisibility,
  TicketWorkflowAction,
  TicketWorkflowState,
} from '@/api/generated/models'

export type {
  TicketCategory,
  TicketStatus,
  TicketVisibility,
  TicketWorkflowState,
} from '@/api/generated/models'

export const TICKET_CATEGORIES = [
  'INFRASTRUCTURE',
  'CLEANING',
  'SAFETY',
  'NOISE',
  'OTHER',
] as const satisfies readonly TicketCategory[]

export const TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
  'CANCELLED',
] as const satisfies readonly TicketStatus[]

export const TICKET_WORKFLOW_STATES = [
  'NEW',
  'AWAITING_PRIMARY_ASSIGNMENT',
  'RETURNED_TO_DISPATCH',
  'IN_PROGRESS',
  'WAITING_FOR_COSIGNATURE',
  'WAITING_FOR_CITIZEN',
  'WAITING_FOR_DECISION',
  'COMPLETED',
] as const satisfies readonly TicketWorkflowState[]

/** Represents one persisted ticket address after crossing the transport boundary. */
export type TicketAddress = Readonly<{
  city: string
  houseNumber: string
  latitude: number | null
  longitude: number | null
  street: string
  zipCode: string
}>

/** Keeps the display data required for a ticket-related authority reference. */
export type TicketUserReference = Readonly<{
  displayName: string
  id: string
}>

/** Keeps the display data required for a ticket-related office reference. */
export type TicketOfficeReference = Readonly<{
  id: string
  name: string
}>

/** Represents the current citizen-visible status projection of one ticket. */
export type TicketStatusRecord = Readonly<{
  createdAt: string
  id: string
  message: string | null
  status: TicketStatus
}>

/** Represents one authority ticket projection used by list and detail views. */
export type TicketRecord = Readonly<{
  address: TicketAddress | null
  allowedActions: readonly TicketWorkflowAction[]
  category: TicketCategory
  createdAt: string
  creator: TicketUserReference
  currentAssignee: TicketUserReference | null
  currentStatus: TicketStatusRecord | null
  description: string | null
  id: string
  imageUrl: string | null
  office: TicketOfficeReference | null
  primaryOfficer: TicketUserReference | null
  returnToUser: TicketUserReference | null
  title: string
  updatedAt: string
  version: number
  visibility: TicketVisibility
  workflowState: TicketWorkflowState
}>

const CATEGORY_LABELS: Readonly<Record<TicketCategory, string>> = {
  CLEANING: 'Sauberkeit',
  INFRASTRUCTURE: 'Infrastruktur',
  NOISE: 'Lärm',
  OTHER: 'Sonstiges',
  SAFETY: 'Sicherheit',
}

const STATUS_LABELS: Readonly<Record<TicketStatus, string>> = {
  CANCELLED: 'Storniert',
  IN_PROGRESS: 'In Bearbeitung',
  OPEN: 'Offen',
  REJECTED: 'Abgelehnt',
  RESOLVED: 'Erledigt',
}

const WORKFLOW_STATE_LABELS: Readonly<Record<TicketWorkflowState, string>> = {
  AWAITING_PRIMARY_ASSIGNMENT: 'Wartet auf Primärzuweisung',
  COMPLETED: 'Abgeschlossen',
  IN_PROGRESS: 'In Bearbeitung',
  NEW: 'Neu eingegangen',
  RETURNED_TO_DISPATCH: 'An Disposition zurückgegeben',
  WAITING_FOR_CITIZEN: 'Wartet auf Bürgerantwort',
  WAITING_FOR_COSIGNATURE: 'Wartet auf Mitzeichnung',
  WAITING_FOR_DECISION: 'Wartet auf Entscheidung',
}

const VISIBILITY_LABELS: Readonly<Record<TicketVisibility, string>> = {
  PRIVATE: 'Nicht öffentlich',
  PUBLIC: 'Öffentlich',
}

const USER_REFERENCE_LABELS: Readonly<Record<string, string>> = {
  'Authority employee': 'Behördenmitarbeiter',
  Citizen: 'Bürger',
  'Unknown user': 'Unbekannte Person',
}

/** Localizes generic backend fallbacks while preserving real display names. */
export function getTicketUserReferenceLabel(displayName: string): string {
  return USER_REFERENCE_LABELS[displayName] ?? displayName
}

/** Localizes one backend ticket category without changing its contract value. */
export function getTicketCategoryLabel(category: TicketCategory): string {
  return CATEGORY_LABELS[category]
}

/** Localizes one citizen-visible ticket status. */
export function getTicketStatusLabel(status: TicketStatus): string {
  return STATUS_LABELS[status]
}

/** Localizes one internal workflow state of the sequential ad-hoc workflow. */
export function getTicketWorkflowStateLabel(
  state: TicketWorkflowState,
): string {
  return WORKFLOW_STATE_LABELS[state]
}

/** Localizes whether citizens may find the ticket in the public directory. */
export function getTicketVisibilityLabel(
  visibility: TicketVisibility,
): string {
  return VISIBILITY_LABELS[visibility]
}

/** Selects the most relevant current responsibility label for compact views. */
export function getTicketCurrentResponsibilityLabel(
  ticket: TicketRecord,
): string {
  if (ticket.currentAssignee) {
    return ticket.currentAssignee.displayName
  }
  if (ticket.primaryOfficer) {
    return ticket.primaryOfficer.displayName
  }
  if (
    ticket.workflowState === 'NEW' ||
    ticket.workflowState === 'RETURNED_TO_DISPATCH'
  ) {
    return 'Disposition'
  }
  if (ticket.workflowState === 'AWAITING_PRIMARY_ASSIGNMENT') {
    return 'Primärzuweisung offen'
  }
  if (ticket.workflowState === 'COMPLETED') {
    return 'Keine aktive Bearbeitung'
  }
  return 'Nicht zugewiesen'
}
