import type {
  TicketCategory,
  TicketStatus,
  TicketVisibility,
  TicketWorkflowState,
} from '@/api/generated/models'
import {
  getTicketCategoryLabel,
  getTicketStatusLabel,
  getTicketVisibilityLabel,
  getTicketWorkflowStateLabel,
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
      {getTicketCategoryLabel(category)}
    </DataViewStatusBadge>
  )
}

/** Presents the citizen-visible status or an explicit missing-state label. */
export function TicketStatusBadge({
  status,
}: Readonly<{ status: TicketStatus | null }>) {
  return (
    <DataViewStatusBadge tone={status ? getStatusTone(status) : 'danger'}>
      {status ? getTicketStatusLabel(status) : 'Status nicht verfügbar'}
    </DataViewStatusBadge>
  )
}

/** Presents the current internal ad-hoc workflow state. */
export function TicketWorkflowStateBadge({
  state,
}: Readonly<{ state: TicketWorkflowState }>) {
  return (
    <DataViewStatusBadge tone={getWorkflowStateTone(state)}>
      {getTicketWorkflowStateLabel(state)}
    </DataViewStatusBadge>
  )
}

/** Presents public visibility as text as well as a stable visual tone. */
export function TicketVisibilityBadge({
  visibility,
}: Readonly<{ visibility: TicketVisibility }>) {
  return (
    <DataViewStatusBadge tone={visibility === 'PUBLIC' ? 'info' : 'neutral'}>
      {getTicketVisibilityLabel(visibility)}
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
