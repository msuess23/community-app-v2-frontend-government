import type {
  TicketCategory,
  TicketLifecycleFilter,
  TicketStatus,
  TicketWorkflowState,
} from '@/api/generated/models'
import {
  getTicketCategoryLabel,
  getTicketStatusLabel,
  getTicketWorkflowStateLabel,
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  TICKET_WORKFLOW_STATES,
} from '@/features/tickets/model/ticket-model'
import type {
  ActiveDataViewFilter,
  DataViewFilterOption,
} from '@/shared/data-view/DataViewFilters'
import type { OfficeReference } from '@/shared/offices/office-model'

export const TICKET_LIFECYCLE_FILTER_OPTIONS: readonly DataViewFilterOption[] = [
  { label: 'Abgeschlossene Tickets', value: 'completed' },
  { label: 'Aktive und abgeschlossene Tickets', value: 'all' },
]

export const TICKET_CATEGORY_FILTER_OPTIONS: readonly DataViewFilterOption[] =
  TICKET_CATEGORIES.map((category) => ({
    label: getTicketCategoryLabel(category),
    value: category,
  }))

export const TICKET_STATUS_FILTER_OPTIONS: readonly DataViewFilterOption[] =
  TICKET_STATUSES.map((status) => ({
    label: getTicketStatusLabel(status),
    value: status,
  }))

export const TICKET_WORKFLOW_STATE_FILTER_OPTIONS: readonly DataViewFilterOption[] =
  TICKET_WORKFLOW_STATES.map((state) => ({
    label: getTicketWorkflowStateLabel(state),
    value: state,
  }))

export type TicketActiveFilterInput = Readonly<{
  category: string
  createdFrom: string
  createdTo: string
  lifecycle: string
  office: string
  offices: readonly OfficeReference[]
  onSetCategory: (value: string) => void
  onSetCreatedFrom: (value: string) => void
  onSetCreatedTo: (value: string) => void
  onSetLifecycle: (value: string) => void
  onSetOffice: (value: string) => void
  onSetSearch: (value: string) => void
  onSetStatus: (value: string) => void
  onSetUpdatedFrom: (value: string) => void
  onSetUpdatedTo: (value: string) => void
  onSetWorkflowState: (value: string) => void
  search: string
  status: string
  updatedFrom: string
  updatedTo: string
  workflowState: string
}>

/** Builds removable filter chips from the URL-owned directory state. */
export function createTicketActiveFilters({
  category,
  createdFrom,
  createdTo,
  lifecycle,
  office,
  offices,
  onSetCategory,
  onSetCreatedFrom,
  onSetCreatedTo,
  onSetLifecycle,
  onSetOffice,
  onSetSearch,
  onSetStatus,
  onSetUpdatedFrom,
  onSetUpdatedTo,
  onSetWorkflowState,
  search,
  status,
  updatedFrom,
  updatedTo,
  workflowState,
}: TicketActiveFilterInput): readonly ActiveDataViewFilter[] {
  const filters: ActiveDataViewFilter[] = []

  if (search) {
    filters.push({
      key: 'search',
      label: `Suche: ${search}`,
      onRemove: () => onSetSearch(''),
    })
  }
  if (lifecycle) {
    filters.push({
      key: 'lifecycle',
      label: `Bestand: ${getTicketLifecycleLabel(lifecycle)}`,
      onRemove: () => onSetLifecycle(''),
    })
  }
  if (
    workflowState &&
    TICKET_WORKFLOW_STATES.includes(workflowState as TicketWorkflowState)
  ) {
    filters.push({
      key: 'workflowState',
      label: `Workflow: ${getTicketWorkflowStateLabel(workflowState as TicketWorkflowState)}`,
      onRemove: () => onSetWorkflowState(''),
    })
  }
  if (status && TICKET_STATUSES.includes(status as TicketStatus)) {
    filters.push({
      key: 'status',
      label: `Status: ${getTicketStatusLabel(status as TicketStatus)}`,
      onRemove: () => onSetStatus(''),
    })
  }
  if (category && TICKET_CATEGORIES.includes(category as TicketCategory)) {
    filters.push({
      key: 'category',
      label: `Kategorie: ${getTicketCategoryLabel(category as TicketCategory)}`,
      onRemove: () => onSetCategory(''),
    })
  }
  if (office) {
    filters.push({
      key: 'office',
      label: `Behörde: ${offices.find((item) => item.id === office)?.name ?? 'Ausgewählte Behörde'}`,
      onRemove: () => onSetOffice(''),
    })
  }
  if (createdFrom) {
    filters.push({
      key: 'createdFrom',
      label: `Erstellt ab: ${createdFrom}`,
      onRemove: () => onSetCreatedFrom(''),
    })
  }
  if (createdTo) {
    filters.push({
      key: 'createdTo',
      label: `Erstellt bis: ${createdTo}`,
      onRemove: () => onSetCreatedTo(''),
    })
  }
  if (updatedFrom) {
    filters.push({
      key: 'updatedFrom',
      label: `Geändert ab: ${updatedFrom}`,
      onRemove: () => onSetUpdatedFrom(''),
    })
  }
  if (updatedTo) {
    filters.push({
      key: 'updatedTo',
      label: `Geändert bis: ${updatedTo}`,
      onRemove: () => onSetUpdatedTo(''),
    })
  }

  return filters
}

/** Keeps a selected office representable while its label is still loading. */
export function createTicketOfficeFilterOptions(
  offices: readonly OfficeReference[],
  selectedOfficeId: string,
): readonly DataViewFilterOption[] {
  const options = offices.map((office) => ({
    label: office.isActive ? office.name : `${office.name} (deaktiviert)`,
    value: office.id,
  }))

  return selectedOfficeId &&
    !options.some((option) => option.value === selectedOfficeId)
    ? [
        ...options,
        { label: 'Ausgewählte Behörde wird geladen', value: selectedOfficeId },
      ]
    : options
}

/** Explains why only the office filter is temporarily unavailable. */
export function getTicketOfficeFilterDescription(
  isLoading: boolean,
  hasError: boolean,
): string | undefined {
  if (isLoading) {
    return 'Die verfügbaren Behörden werden geladen.'
  }
  if (hasError) {
    return 'Die Behördenauswahl konnte nicht geladen werden. Die übrigen Filter bleiben verfügbar.'
  }
  return undefined
}

function getTicketLifecycleLabel(value: string): string {
  const lifecycle = value as TicketLifecycleFilter

  if (lifecycle === 'completed') {
    return 'Abgeschlossene Tickets'
  }
  if (lifecycle === 'all') {
    return 'Aktive und abgeschlossene Tickets'
  }
  return 'Aktive Tickets'
}
