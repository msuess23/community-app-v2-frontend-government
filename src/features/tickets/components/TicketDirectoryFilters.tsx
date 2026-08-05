import type {
  TicketCategory,
  TicketLifecycleFilter,
  TicketStatus,
  TicketWorkflowState,
} from '@/api/generated/models'
import type { TicketDirectorySortField } from '@/features/tickets/model/ticket-directory'
import {
  getTicketCategoryLabel,
  getTicketStatusLabel,
  getTicketWorkflowStateLabel,
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  TICKET_WORKFLOW_STATES,
} from '@/features/tickets/model/ticket-model'
import {
  ActiveDataViewFilters,
  DataViewFilterDateField,
  DataViewFilterPanel,
  DataViewFilterSelect,
  type ActiveDataViewFilter,
  type DataViewFilterOption,
} from '@/shared/data-view/DataViewFilters'
import {
  DataViewSortControl,
  type DataViewSortOption,
} from '@/shared/data-view/DataViewSortControl'
import type { DataViewSort } from '@/shared/data-view/data-view-url-state'
import type { OfficeReference } from '@/shared/offices/office-model'

const LIFECYCLE_OPTIONS: readonly DataViewFilterOption[] = [
  { label: 'Abgeschlossene Tickets', value: 'completed' },
  { label: 'Aktive und abgeschlossene Tickets', value: 'all' },
]
const CATEGORY_OPTIONS = TICKET_CATEGORIES.map((category) => ({
  label: getTicketCategoryLabel(category),
  value: category,
}))
const STATUS_OPTIONS = TICKET_STATUSES.map((status) => ({
  label: getTicketStatusLabel(status),
  value: status,
}))
const WORKFLOW_STATE_OPTIONS = TICKET_WORKFLOW_STATES.map((state) => ({
  label: getTicketWorkflowStateLabel(state),
  value: state,
}))

export interface TicketDirectoryFiltersProps {
  category: string
  createdFrom: string
  createdTo: string
  isOfficeDirectoryLoading: boolean
  lifecycle: string
  office: string
  officeDirectoryError: boolean
  offices: readonly OfficeReference[]
  onReset: () => void
  onSetCategory: (value: string) => void
  onSetCreatedFrom: (value: string) => void
  onSetCreatedTo: (value: string) => void
  onSetLifecycle: (value: string) => void
  onSetOffice: (value: string) => void
  onSetSearch: (value: string) => void
  onSetSort: (sort: DataViewSort<TicketDirectorySortField> | null) => void
  onSetStatus: (value: string) => void
  onSetUpdatedFrom: (value: string) => void
  onSetUpdatedTo: (value: string) => void
  onSetWorkflowState: (value: string) => void
  search: string
  sort: DataViewSort<TicketDirectorySortField> | null
  sortOptions: readonly DataViewSortOption<TicketDirectorySortField>[]
  status: string
  updatedFrom: string
  updatedTo: string
  workflowState: string
}

/** Renders the supported role-scoped ticket filters without raw UUID inputs. */
export function TicketDirectoryFilters({
  category,
  createdFrom,
  createdTo,
  isOfficeDirectoryLoading,
  lifecycle,
  office,
  officeDirectoryError,
  offices,
  onReset,
  onSetCategory,
  onSetCreatedFrom,
  onSetCreatedTo,
  onSetLifecycle,
  onSetOffice,
  onSetSearch,
  onSetSort,
  onSetStatus,
  onSetUpdatedFrom,
  onSetUpdatedTo,
  onSetWorkflowState,
  search,
  sort,
  sortOptions,
  status,
  updatedFrom,
  updatedTo,
  workflowState,
}: TicketDirectoryFiltersProps) {
  const officeOptions = createOfficeOptions(offices, office)
  const activeFilters = createActiveFilters({
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
  })
  const filterCount = [
    lifecycle,
    workflowState,
    status,
    category,
    office,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      <DataViewFilterPanel
        activeFilterCount={filterCount}
        onReset={onReset}
        title="Tickets filtern und sortieren"
      >
        <DataViewFilterSelect
          allLabel="Aktive Tickets"
          label="Bestand"
          onChange={onSetLifecycle}
          options={LIFECYCLE_OPTIONS}
          value={lifecycle}
        />
        <DataViewFilterSelect
          allLabel="Alle Workflowzustände"
          label="Workflowzustand"
          onChange={onSetWorkflowState}
          options={WORKFLOW_STATE_OPTIONS}
          value={workflowState}
        />
        <DataViewFilterSelect
          allLabel="Alle öffentlichen Status"
          label="Öffentlicher Status"
          onChange={onSetStatus}
          options={STATUS_OPTIONS}
          value={status}
        />
        <DataViewFilterSelect
          allLabel="Alle Kategorien"
          label="Kategorie"
          onChange={onSetCategory}
          options={CATEGORY_OPTIONS}
          value={category}
        />
        <DataViewFilterSelect
          allLabel="Alle Behörden"
          description={getOfficeFilterDescription(
            isOfficeDirectoryLoading,
            officeDirectoryError,
          )}
          isDisabled={isOfficeDirectoryLoading || officeDirectoryError}
          label="Behörde"
          onChange={onSetOffice}
          options={officeOptions}
          value={office}
        />
        <DataViewFilterDateField
          description="Das Ticket wurde frühestens an diesem Kalendertag erstellt."
          label="Erstellt ab"
          max={createdTo || undefined}
          onChange={onSetCreatedFrom}
          value={createdFrom}
        />
        <DataViewFilterDateField
          description="Das Ticket wurde spätestens an diesem Kalendertag erstellt."
          label="Erstellt bis"
          min={createdFrom || undefined}
          onChange={onSetCreatedTo}
          value={createdTo}
        />
        <DataViewFilterDateField
          description="Das Ticket wurde frühestens an diesem Kalendertag geändert."
          label="Geändert ab"
          max={updatedTo || undefined}
          onChange={onSetUpdatedFrom}
          value={updatedFrom}
        />
        <DataViewFilterDateField
          description="Das Ticket wurde spätestens an diesem Kalendertag geändert."
          label="Geändert bis"
          min={updatedFrom || undefined}
          onChange={onSetUpdatedTo}
          value={updatedTo}
        />
        <DataViewSortControl
          onChange={onSetSort}
          options={sortOptions}
          value={sort}
        />
      </DataViewFilterPanel>

      <ActiveDataViewFilters filters={activeFilters} />
    </div>
  )
}

type ActiveFilterInput = Pick<
  TicketDirectoryFiltersProps,
  | 'category'
  | 'createdFrom'
  | 'createdTo'
  | 'lifecycle'
  | 'office'
  | 'offices'
  | 'onSetCategory'
  | 'onSetCreatedFrom'
  | 'onSetCreatedTo'
  | 'onSetLifecycle'
  | 'onSetOffice'
  | 'onSetSearch'
  | 'onSetStatus'
  | 'onSetUpdatedFrom'
  | 'onSetUpdatedTo'
  | 'onSetWorkflowState'
  | 'search'
  | 'status'
  | 'updatedFrom'
  | 'updatedTo'
  | 'workflowState'
>

function createActiveFilters({
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
}: ActiveFilterInput): readonly ActiveDataViewFilter[] {
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
      label: `Bestand: ${getLifecycleLabel(lifecycle)}`,
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

function createOfficeOptions(
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

function getLifecycleLabel(value: string): string {
  const lifecycle = value as TicketLifecycleFilter

  if (lifecycle === 'completed') {
    return 'Abgeschlossene Tickets'
  }
  if (lifecycle === 'all') {
    return 'Aktive und abgeschlossene Tickets'
  }
  return 'Aktive Tickets'
}

function getOfficeFilterDescription(
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
