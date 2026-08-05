import type { TicketDirectorySortField } from '@/features/tickets/model/ticket-directory'
import {
  createTicketActiveFilters,
  createTicketOfficeFilterOptions,
  getTicketOfficeFilterDescription,
  TICKET_CATEGORY_FILTER_OPTIONS,
  TICKET_LIFECYCLE_FILTER_OPTIONS,
  TICKET_STATUS_FILTER_OPTIONS,
  TICKET_WORKFLOW_STATE_FILTER_OPTIONS,
} from '@/features/tickets/model/ticket-directory-filters'
import {
  ActiveDataViewFilters,
  DataViewFilterDateField,
  DataViewFilterPanel,
  DataViewFilterSelect,
} from '@/shared/data-view/DataViewFilters'
import {
  DataViewSortControl,
  type DataViewSortOption,
} from '@/shared/data-view/DataViewSortControl'
import type { DataViewSort } from '@/shared/data-view/data-view-url-state'
import type { OfficeReference } from '@/shared/offices/office-model'

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
  const officeOptions = createTicketOfficeFilterOptions(offices, office)
  const activeFilters = createTicketActiveFilters({
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
          options={TICKET_LIFECYCLE_FILTER_OPTIONS}
          value={lifecycle}
        />
        <DataViewFilterSelect
          allLabel="Alle Workflowzustände"
          label="Workflowzustand"
          onChange={onSetWorkflowState}
          options={TICKET_WORKFLOW_STATE_FILTER_OPTIONS}
          value={workflowState}
        />
        <DataViewFilterSelect
          allLabel="Alle öffentlichen Status"
          label="Öffentlicher Status"
          onChange={onSetStatus}
          options={TICKET_STATUS_FILTER_OPTIONS}
          value={status}
        />
        <DataViewFilterSelect
          allLabel="Alle Kategorien"
          label="Kategorie"
          onChange={onSetCategory}
          options={TICKET_CATEGORY_FILTER_OPTIONS}
          value={category}
        />
        <DataViewFilterSelect
          allLabel="Alle Behörden"
          description={getTicketOfficeFilterDescription(
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
