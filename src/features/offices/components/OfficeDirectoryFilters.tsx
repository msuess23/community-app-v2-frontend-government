import type { OfficeDirectoryAccess } from '@/features/offices/model/office-directory'
import {
  ActiveDataViewFilters,
  DataViewFilterPanel,
  DataViewFilterSelect,
  type ActiveDataViewFilter,
  type DataViewFilterOption,
} from '@/shared/data-view/DataViewFilters'

const STATUS_OPTIONS: readonly DataViewFilterOption[] = [
  { label: 'Nur aktive Behörden', value: 'active' },
  { label: 'Nur deaktivierte Behörden', value: 'inactive' },
  { label: 'Aktive und deaktivierte Behörden', value: 'all' },
]

export interface OfficeDirectoryFiltersProps {
  access: OfficeDirectoryAccess
  onReset: () => void
  onSetSearch: (value: string) => void
  onSetStatus: (value: string) => void
  search: string
  status: string
}

/** Renders the administrator-only lifecycle filter and removable active values. */
export function OfficeDirectoryFilters({
  access,
  onReset,
  onSetSearch,
  onSetStatus,
  search,
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
      {access.canFilterByStatus ? (
        <DataViewFilterPanel
          activeFilterCount={status ? 1 : 0}
          onReset={onReset}
          title="Behörden filtern"
        >
          <DataViewFilterSelect
            allLabel="Aktive Behörden (Standard)"
            label="Behördenstatus"
            onChange={onSetStatus}
            options={STATUS_OPTIONS}
            value={status}
          />
        </DataViewFilterPanel>
      ) : null}

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
