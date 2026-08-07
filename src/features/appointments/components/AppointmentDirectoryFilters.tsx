import type { AppointmentDirectorySortField } from '@/features/appointments/model/appointment-directory'
import {
  APPOINTMENT_STATUS_FILTER_OPTIONS,
  createAppointmentActiveFilters,
  createAppointmentCitizenFilterOptions,
  createAppointmentTicketFilterOptions,
  getAppointmentFilterOptionsDescription,
} from '@/features/appointments/model/appointment-directory-filters'
import type {
  AppointmentTicketReference,
  AppointmentUserReference,
} from '@/features/appointments/model/appointment-model'
import {
  ActiveDataViewFilters,
  DataViewFilterDateField,
  DataViewFilterPanel,
  DataViewFilterSearchableSelect,
  DataViewFilterSelect,
} from '@/shared/data-view/DataViewFilters'
import {
  DataViewSortControl,
  type DataViewSortOption,
} from '@/shared/data-view/DataViewSortControl'
import type { DataViewSort } from '@/shared/data-view/data-view-url-state'

export interface AppointmentDirectoryFiltersProps {
  citizen: string
  citizens: readonly AppointmentUserReference[]
  createdFrom: string
  createdTo: string
  filterOptionsError: boolean
  isFilterOptionsLoading: boolean
  onReset: () => void
  onSetCitizen: (value: string) => void
  onSetCreatedFrom: (value: string) => void
  onSetCreatedTo: (value: string) => void
  onSetSearch: (value: string) => void
  onSetSort: (
    sort: DataViewSort<AppointmentDirectorySortField> | null,
  ) => void
  onSetStartsFrom: (value: string) => void
  onSetStartsTo: (value: string) => void
  onSetStatus: (value: string) => void
  onSetTicket: (value: string) => void
  search: string
  sort: DataViewSort<AppointmentDirectorySortField> | null
  sortOptions: readonly DataViewSortOption<AppointmentDirectorySortField>[]
  startsFrom: string
  startsTo: string
  status: string
  ticket: string
  tickets: readonly AppointmentTicketReference[]
}

/** Renders all backend-supported authority appointment filters without raw identifiers. */
export function AppointmentDirectoryFilters(
  props: AppointmentDirectoryFiltersProps,
) {
  const scopedDescription = getAppointmentFilterOptionsDescription(
    props.isFilterOptionsLoading,
    props.filterOptionsError,
  )
  const scopedDisabled =
    props.isFilterOptionsLoading || props.filterOptionsError
  const activeFilters = createAppointmentActiveFilters(props)
  const filterCount = [
    props.status,
    props.citizen,
    props.ticket,
    props.startsFrom,
    props.startsTo,
    props.createdFrom,
    props.createdTo,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      <DataViewFilterPanel
        activeFilterCount={filterCount}
        onReset={props.onReset}
        title="Termine filtern und sortieren"
      >
        <DataViewFilterSelect
          allLabel="Alle Status"
          label="Status"
          onChange={props.onSetStatus}
          options={APPOINTMENT_STATUS_FILTER_OPTIONS}
          value={props.status}
        />
        <DataViewFilterSearchableSelect
          allLabel="Alle Bürger"
          description={scopedDescription}
          isDisabled={scopedDisabled}
          label="Bürger"
          onChange={props.onSetCitizen}
          options={createAppointmentCitizenFilterOptions(
            props.citizens,
            props.citizen,
          )}
          searchPlaceholder="Name suchen"
          value={props.citizen}
        />
        <DataViewFilterSelect
          allLabel="Alle verknüpften Tickets"
          description={scopedDescription}
          isDisabled={scopedDisabled}
          label="Ticket"
          onChange={props.onSetTicket}
          options={createAppointmentTicketFilterOptions(
            props.tickets,
            props.ticket,
          )}
          value={props.ticket}
        />
        <DataViewFilterDateField
          label="Termin ab"
          max={props.startsTo || undefined}
          onChange={props.onSetStartsFrom}
          value={props.startsFrom}
        />
        <DataViewFilterDateField
          label="Termin bis"
          min={props.startsFrom || undefined}
          onChange={props.onSetStartsTo}
          value={props.startsTo}
        />
        <DataViewFilterDateField
          label="Erstellt ab"
          max={props.createdTo || undefined}
          onChange={props.onSetCreatedFrom}
          value={props.createdFrom}
        />
        <DataViewFilterDateField
          label="Erstellt bis"
          min={props.createdFrom || undefined}
          onChange={props.onSetCreatedTo}
          value={props.createdTo}
        />
        <DataViewSortControl
          onChange={props.onSetSort}
          options={props.sortOptions}
          value={props.sort}
        />
      </DataViewFilterPanel>
      <ActiveDataViewFilters filters={activeFilters} />
    </div>
  )
}
