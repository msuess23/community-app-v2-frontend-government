import type { AppointmentSlotDirectorySortField } from '@/features/appointments/model/appointment-slot-directory'
import {
  APPOINTMENT_SLOT_STATUS_FILTER_OPTIONS,
  createAppointmentSlotActiveFilters,
} from '@/features/appointments/model/appointment-slot-directory-filters'
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

export interface AppointmentSlotDirectoryFiltersProps {
  onReset: () => void
  onSetSort: (
    sort: DataViewSort<AppointmentSlotDirectorySortField> | null,
  ) => void
  onSetStartsFrom: (value: string) => void
  onSetStartsTo: (value: string) => void
  onSetStatus: (value: string) => void
  sort: DataViewSort<AppointmentSlotDirectorySortField> | null
  sortOptions: readonly DataViewSortOption<AppointmentSlotDirectorySortField>[]
  startsFrom: string
  startsTo: string
  status: string
}

/** Renders every backend-supported authority slot filter and sort control. */
export function AppointmentSlotDirectoryFilters(
  props: AppointmentSlotDirectoryFiltersProps,
) {
  const activeFilters = createAppointmentSlotActiveFilters(props)
  const filterCount = [props.status, props.startsFrom, props.startsTo].filter(
    Boolean,
  ).length

  return (
    <div className="space-y-4">
      <DataViewFilterPanel
        activeFilterCount={filterCount}
        onReset={props.onReset}
        title="Terminslots filtern und sortieren"
      >
        <DataViewFilterSelect
          allLabel="Alle Status"
          label="Status"
          onChange={props.onSetStatus}
          options={APPOINTMENT_SLOT_STATUS_FILTER_OPTIONS}
          value={props.status}
        />
        <DataViewFilterDateField
          label="Beginn ab"
          max={props.startsTo || undefined}
          onChange={props.onSetStartsFrom}
          value={props.startsFrom}
        />
        <DataViewFilterDateField
          label="Beginn bis"
          min={props.startsFrom || undefined}
          onChange={props.onSetStartsTo}
          value={props.startsTo}
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
