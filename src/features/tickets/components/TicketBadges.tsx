import {
  getTicketCategoryLabel,
  getTicketStatusLabel,
  getTicketVisibilityLabel,
  getTicketWorkflowStateLabel,
  type TicketCategory,
  type TicketStatus,
  type TicketVisibility,
  type TicketWorkflowState,
} from '@/features/tickets/model/ticket-model'
import {
  DataViewStatusBadge,
  type DataViewStatusTone,
} from '@/shared/data-view/DataViewStatusBadge'

/** Presents one localized ticket category without relying on color alone. */
export function TicketCategoryBadge({
  category,
}: Readonly<{ category: TicketCategory }>) {
  return (
    <DataViewStatusBadge tone="neutral">
      <span className="sr-only">Kategorie: </span>
      <span>{getTicketCategoryLabel(category)}</span>
    </DataViewStatusBadge>
  )
}

/** Presents the citizen-visible status or an explicit missing-state label. */
export function TicketStatusBadge({
  status,
}: Readonly<{ status: TicketStatus | null }>) {
  return (
    <DataViewStatusBadge tone={status ? getStatusTone(status) : 'danger'}>
      <span className="sr-only">Öffentlicher Status: </span>
      <span>
        {status ? getTicketStatusLabel(status) : 'Status nicht verfügbar'}
      </span>
    </DataViewStatusBadge>
  )
}

/** Presents the current internal ad-hoc workflow state. */
export function TicketWorkflowStateBadge({
  state,
}: Readonly<{ state: TicketWorkflowState }>) {
  return (
    <DataViewStatusBadge tone={getWorkflowStateTone(state)}>
      <span className="sr-only">Workflowzustand: </span>
      <span>{getTicketWorkflowStateLabel(state)}</span>
    </DataViewStatusBadge>
  )
}

/** Presents public visibility as text as well as a stable visual tone. */
export function TicketVisibilityBadge({
  visibility,
}: Readonly<{ visibility: TicketVisibility }>) {
  return (
    <DataViewStatusBadge tone={visibility === 'PUBLIC' ? 'info' : 'neutral'}>
      <span className="sr-only">Sichtbarkeit: </span>
      <span>{getTicketVisibilityLabel(visibility)}</span>
    </DataViewStatusBadge>
  )
}

function getStatusTone(status: TicketStatus): DataViewStatusTone {
  if (status === 'RESOLVED') {
    return 'success'
  }
  if (status === 'REJECTED' || status === 'CANCELLED') {
    return 'danger'
  }
  if (status === 'IN_PROGRESS') {
    return 'info'
  }
  return 'warning'
}

function getWorkflowStateTone(
  state: TicketWorkflowState,
): DataViewStatusTone {
  if (state === 'COMPLETED') {
    return 'success'
  }
  if (state === 'IN_PROGRESS') {
    return 'info'
  }
  if (state === 'NEW') {
    return 'warning'
  }
  return 'neutral'
}
