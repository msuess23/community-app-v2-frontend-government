import type { InfoCategory, InfoStatus } from '@/api/generated/models'
import {
  getInfoCategoryLabel,
  getInfoStatusLabel,
} from '@/features/infos/model/info-model'
import type { InfoDirectorySortField } from '@/features/infos/model/info-directory'
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

const CATEGORIES: readonly InfoCategory[] = [
  'EVENT',
  'CONSTRUCTION',
  'MAINTENANCE',
  'ANNOUNCEMENT',
  'OTHER',
]
const STATUSES: readonly InfoStatus[] = [
  'SCHEDULED',
  'ACTIVE',
  'DONE',
  'CANCELLED',
]
const CATEGORY_OPTIONS = CATEGORIES.map((category) => ({
  label: getInfoCategoryLabel(category),
  value: category,
}))
const STATUS_OPTIONS = STATUSES.map((status) => ({
  label: getInfoStatusLabel(status),
  value: status,
}))

export interface InfoDirectoryFiltersProps {
  category: string
  endsTo: string
  isOfficeDirectoryLoading: boolean
  office: string
  officeDirectoryError: boolean
  offices: readonly OfficeReference[]
  onReset: () => void
  onSetCategory: (value: string) => void
  onSetEndsTo: (value: string) => void
  onSetOffice: (value: string) => void
  onSetSearch: (value: string) => void
  onSetSort: (sort: DataViewSort<InfoDirectorySortField> | null) => void
  onSetStartsFrom: (value: string) => void
  onSetStatus: (value: string) => void
  search: string
  sort: DataViewSort<InfoDirectorySortField> | null
  sortOptions: readonly DataViewSortOption<InfoDirectorySortField>[]
  startsFrom: string
  status: string
}

/** Renders every non-geographic Info filter supported by the paginated backend list. */
export function InfoDirectoryFilters({
  category,
  endsTo,
  isOfficeDirectoryLoading,
  office,
  officeDirectoryError,
  offices,
  onReset,
  onSetCategory,
  onSetEndsTo,
  onSetOffice,
  onSetSearch,
  onSetSort,
  onSetStartsFrom,
  onSetStatus,
  search,
  sort,
  sortOptions,
  startsFrom,
  status,
}: InfoDirectoryFiltersProps) {
  const officeOptions = createOfficeOptions(offices, office)
  const activeFilters = createActiveFilters({
    category,
    endsTo,
    office,
    offices,
    onSetCategory,
    onSetEndsTo,
    onSetOffice,
    onSetSearch,
    onSetStartsFrom,
    onSetStatus,
    search,
    startsFrom,
    status,
  })
  const filterCount = [office, category, status, startsFrom, endsTo].filter(
    Boolean,
  ).length

  return (
    <div className="space-y-4">
      <DataViewFilterPanel
        activeFilterCount={filterCount}
        onReset={onReset}
        title="Mitteilungen filtern und sortieren"
      >
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
        <DataViewFilterSelect
          allLabel="Alle Kategorien"
          label="Kategorie"
          onChange={onSetCategory}
          options={CATEGORY_OPTIONS}
          value={category}
        />
        <DataViewFilterSelect
          allLabel="Alle Status"
          label="Status"
          onChange={onSetStatus}
          options={STATUS_OPTIONS}
          value={status}
        />
        <DataViewFilterDateField
          description="Der Beginn der Mitteilung liegt frühestens an diesem Kalendertag."
          label="Beginnt ab"
          max={endsTo || undefined}
          onChange={onSetStartsFrom}
          value={startsFrom}
        />
        <DataViewFilterDateField
          description="Das Ende der Mitteilung liegt spätestens an diesem Kalendertag."
          label="Endet bis"
          min={startsFrom || undefined}
          onChange={onSetEndsTo}
          value={endsTo}
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
  InfoDirectoryFiltersProps,
  | 'category'
  | 'endsTo'
  | 'office'
  | 'offices'
  | 'onSetCategory'
  | 'onSetEndsTo'
  | 'onSetOffice'
  | 'onSetSearch'
  | 'onSetStartsFrom'
  | 'onSetStatus'
  | 'search'
  | 'startsFrom'
  | 'status'
>

function createActiveFilters({
  category,
  endsTo,
  office,
  offices,
  onSetCategory,
  onSetEndsTo,
  onSetOffice,
  onSetSearch,
  onSetStartsFrom,
  onSetStatus,
  search,
  startsFrom,
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
  if (office) {
    filters.push({
      key: 'office',
      label: `Behörde: ${offices.find((item) => item.id === office)?.name ?? 'Ausgewählte Behörde'}`,
      onRemove: () => onSetOffice(''),
    })
  }
  if (category && CATEGORIES.includes(category as InfoCategory)) {
    filters.push({
      key: 'category',
      label: `Kategorie: ${getInfoCategoryLabel(category as InfoCategory)}`,
      onRemove: () => onSetCategory(''),
    })
  }
  if (status && STATUSES.includes(status as InfoStatus)) {
    filters.push({
      key: 'status',
      label: `Status: ${getInfoStatusLabel(status as InfoStatus)}`,
      onRemove: () => onSetStatus(''),
    })
  }
  if (startsFrom) {
    filters.push({
      key: 'startsFrom',
      label: `Beginnt ab: ${startsFrom}`,
      onRemove: () => onSetStartsFrom(''),
    })
  }
  if (endsTo) {
    filters.push({
      key: 'endsTo',
      label: `Endet bis: ${endsTo}`,
      onRemove: () => onSetEndsTo(''),
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
