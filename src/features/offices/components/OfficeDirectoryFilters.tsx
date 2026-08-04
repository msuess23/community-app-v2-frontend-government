import type {
  OfficeDirectoryAccess,
  OfficeDirectorySortField,
} from '@/features/offices/model/office-directory'
import {
  ActiveDataViewFilters,
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

const STATUS_OPTIONS: readonly DataViewFilterOption[] = [
  { label: 'Nur aktive Behörden', value: 'active' },
  { label: 'Nur deaktivierte Behörden', value: 'inactive' },
  { label: 'Aktive und deaktivierte Behörden', value: 'all' },
]

export interface OfficeDirectoryFiltersProps {
  access: OfficeDirectoryAccess
  onReset: () => void
  onSetSearch: (value: string) => void
  onSetSort: (sort: DataViewSort<OfficeDirectorySortField> | null) => void
  onSetStatus: (value: string) => void
  search: string
  sort: DataViewSort<OfficeDirectorySortField> | null
  sortOptions: readonly DataViewSortOption<OfficeDirectorySortField>[]
  status: string
}

/** Renders lifecycle filtering and backend sorting in one responsive control panel. */
export function OfficeDirectoryFilters({
  access,
  onReset,
  onSetSearch,
  onSetSort,
  onSetStatus,
  search,
  sort,
  sortOptions,
  status,
}: OfficeDirectoryFiltersProps) {
  const activeFilters = createActiveFilters({
    access,
    onSetSearch,
    onSetStatus,
    search,
    status,
  })

  return (
    <div className="space-y-4">
      <DataViewFilterPanel
        activeFilterCount={access.canFilterByStatus && status ? 1 : 0}
        onReset={onReset}
        title="Behörden filtern und sortieren"
      >
        {access.canFilterByStatus ? (
          <DataViewFilterSelect
            allLabel="Aktive Behörden (Standard)"
            label="Behördenstatus"
            onChange={onSetStatus}
            options={STATUS_OPTIONS}
            value={status}
          />
        ) : null}

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
  OfficeDirectoryFiltersProps,
  'access' | 'onSetSearch' | 'onSetStatus' | 'search' | 'status'
>

/** Builds removable filter chips from the current role-scoped URL state. */
function createActiveFilters({
  access,
  onSetSearch,
  onSetStatus,
  search,
  status,
}: ActiveFilterInput): readonly ActiveDataViewFilter[] {
  const filters: ActiveDataViewFilter[] = []

  if (search) {
    filters.push({
      key: 'search',
      label: `Suche: ${search}`,
      onRemove: () => onSetSearch(''),
    })
  }

  if (status && access.canFilterByStatus) {
    filters.push({
      key: 'status',
      label: `Status: ${getStatusLabel(status)}`,
      onRemove: () => onSetStatus(''),
    })
  }

  return filters
}

/** Localizes lifecycle values represented by the office API. */
function getStatusLabel(status: string): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}
