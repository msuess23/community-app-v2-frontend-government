import type { Role } from '@/auth/auth-types'
import { getRoleLabel } from '@/auth/role-labels'
import type { UserDirectoryAccess } from '@/features/users/model/user-directory'
import {
  ActiveDataViewFilters,
  DataViewFilterPanel,
  DataViewFilterSelect,
  type ActiveDataViewFilter,
  type DataViewFilterOption,
} from '@/shared/data-view/DataViewFilters'
import type { OfficeReference } from '@/shared/offices/office-model'

const STATUS_OPTIONS: readonly DataViewFilterOption[] = [
  { label: 'Nur aktive Konten', value: 'active' },
  { label: 'Deaktiviert', value: 'inactive' },
  { label: 'Aktiv und deaktiviert', value: 'all' },
]

export interface UserDirectoryFiltersProps {
  access: UserDirectoryAccess
  isOfficeDirectoryLoading: boolean
  officeDirectoryError: boolean
  offices: readonly OfficeReference[]
  onReset: () => void
  onSetOffice: (value: string) => void
  onSetRole: (value: string) => void
  onSetStatus: (value: string) => void
  onSetSearch: (value: string) => void
  office: string
  role: string
  search: string
  status: string
}

/** Renders only filters the backend permits for the authenticated directory role. */
export function UserDirectoryFilters({
  access,
  isOfficeDirectoryLoading,
  officeDirectoryError,
  offices,
  onReset,
  onSetOffice,
  onSetRole,
  onSetStatus,
  onSetSearch,
  office,
  role,
  search,
  status,
}: UserDirectoryFiltersProps) {
  const activeFilters = createActiveFilters({
    access,
    office,
    offices,
    onSetOffice,
    onSetRole,
    onSetStatus,
    onSetSearch,
    role,
    search,
    status,
  })
  const panelFilterCount = [
    role,
    access.canFilterByOffice ? office : '',
    access.canFilterByStatus ? status : '',
  ].filter(Boolean).length
  const officeOptions = createOfficeOptions(offices, office)

  return (
    <div className="space-y-4">
      <DataViewFilterPanel
        activeFilterCount={panelFilterCount}
        onReset={onReset}
        title="Benutzer filtern"
      >
        <DataViewFilterSelect
          allLabel="Alle verfügbaren Rollen"
          label="Rolle"
          onChange={onSetRole}
          options={access.roleOptions.map(toRoleOption)}
          value={role}
        />

        {access.canFilterByOffice ? (
          <DataViewFilterSelect
            allLabel="Alle verfügbaren Behörden"
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
        ) : null}

        {access.canFilterByStatus ? (
          <DataViewFilterSelect
            allLabel="Aktive Konten (Standard)"
            label="Kontostatus"
            onChange={onSetStatus}
            options={STATUS_OPTIONS}
            value={status}
          />
        ) : null}
      </DataViewFilterPanel>

      <ActiveDataViewFilters filters={activeFilters} />
    </div>
  )
}

type ActiveFilterInput = Pick<
  UserDirectoryFiltersProps,
  | 'access'
  | 'office'
  | 'offices'
  | 'onSetOffice'
  | 'onSetRole'
  | 'onSetStatus'
  | 'onSetSearch'
  | 'role'
  | 'search'
  | 'status'
>

/** Builds removable filter chips from the current role-scoped URL state. */
function createActiveFilters({
  access,
  office,
  offices,
  onSetOffice,
  onSetRole,
  onSetStatus,
  onSetSearch,
  role,
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

  if (role && access.roleOptions.includes(role as Role)) {
    filters.push({
      key: 'role',
      label: `Rolle: ${getRoleLabel(role as Role)}`,
      onRemove: () => onSetRole(''),
    })
  }

  if (office && access.canFilterByOffice) {
    const officeName = offices.find((item) => item.id === office)?.name
    filters.push({
      key: 'office',
      label: `Behörde: ${officeName ?? 'Ausgewählte Behörde'}`,
      onRemove: () => onSetOffice(''),
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

/** Converts a backend role to one localized filter option. */
function toRoleOption(role: Role): DataViewFilterOption {
  return { label: getRoleLabel(role), value: role }
}

/** Keeps a URL-selected office representable while directory options are loading. */
function createOfficeOptions(
  offices: readonly OfficeReference[],
  selectedOfficeId: string,
): readonly DataViewFilterOption[] {
  const options = offices.map((item) => ({
    label: item.isActive ? item.name : `${item.name} (deaktiviert)`,
    value: item.id,
  }))

  if (
    selectedOfficeId &&
    !options.some((option) => option.value === selectedOfficeId)
  ) {
    return [
      ...options,
      { label: 'Ausgewählte Behörde wird geladen', value: selectedOfficeId },
    ]
  }

  return options
}

/** Describes office-filter availability without blocking the user directory itself. */
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

/** Localizes lifecycle filter values used by the user API. */
function getStatusLabel(status: string): string {
  if (status === 'active') {
    return 'Aktiv'
  }

  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}
