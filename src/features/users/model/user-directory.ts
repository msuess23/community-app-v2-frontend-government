import type {
  GetAllUsersApiV1UsersGetParams,
  LifecycleStatusFilter,
  Role as ApiRole,
  SortOrder,
  UserSortField,
} from '@/api/generated/models'
import type { Role } from '@/auth/auth-types'
import type {
  DataViewFilterDefinition,
  DataViewSort,
  DataViewUrlConfig,
  DataViewUrlState,
} from '@/shared/data-view/data-view-url-state'

export type UserDirectoryFilterKey = 'office' | 'role' | 'status'
export type UserDirectorySortField =
  | 'createdAt'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'role'

export type UserDirectoryAccess = Readonly<{
  canFilterByOffice: boolean
  canFilterByStatus: boolean
  roleOptions: readonly Role[]
}>

const AUTHORITY_ROLES: readonly Role[] = [
  'DISPATCHER',
  'OFFICER',
  'MANAGER',
  'ADMIN',
]
const ALL_ROLES: readonly Role[] = ['CITIZEN', ...AUTHORITY_ROLES]
const SORT_FIELD_TO_API: Readonly<
  Record<UserDirectorySortField, UserSortField>
> = {
  createdAt: 'created_at',
  email: 'email',
  firstName: 'first_name',
  lastName: 'last_name',
  role: 'role',
}
const DIRECTORY_SORT_FIELDS = Object.freeze(
  Object.keys(SORT_FIELD_TO_API) as UserDirectorySortField[],
)
const DEFAULT_SORT: DataViewSort<UserDirectorySortField> = {
  direction: 'asc',
  field: 'lastName',
}

/** Describes which filters the backend permits for the authenticated role. */
export function getUserDirectoryAccess(role: Role): UserDirectoryAccess {
  return {
    canFilterByOffice: role === 'ADMIN' || role === 'DISPATCHER',
    canFilterByStatus: role === 'ADMIN',
    roleOptions: role === 'ADMIN' ? ALL_ROLES : AUTHORITY_ROLES,
  }
}

/** Creates stable URL-state configuration for the caller's permitted filters. */
export function createUserDirectoryUrlConfig(
  access: UserDirectoryAccess,
): DataViewUrlConfig<UserDirectorySortField, UserDirectoryFilterKey> {
  const filters: DataViewFilterDefinition<UserDirectoryFilterKey>[] = [
    { key: 'role' },
  ]

  if (access.canFilterByOffice) {
    filters.push({ key: 'office' })
  }

  if (access.canFilterByStatus) {
    filters.push({ key: 'status' })
  }

  return {
    defaultPageSize: 20,
    defaultSort: DEFAULT_SORT,
    filters,
    pageSizeOptions: [10, 20, 50, 100],
    sortFields: DIRECTORY_SORT_FIELDS,
  }
}

/** Maps URL-owned feature state to the generated backend query parameters. */
export function toUserDirectoryApiParams(
  state: DataViewUrlState<UserDirectorySortField, UserDirectoryFilterKey>,
  access: UserDirectoryAccess,
): GetAllUsersApiV1UsersGetParams {
  const role = readAllowedRole(state.filters.role?.[0], access.roleOptions)
  const status = access.canFilterByStatus
    ? readLifecycleStatus(state.filters.status?.[0])
    : undefined
  const officeId = access.canFilterByOffice
    ? normalizeOptionalValue(state.filters.office?.[0])
    : undefined
  const sort = state.sort ?? DEFAULT_SORT

  return {
    office_id: officeId,
    order: sort.direction as SortOrder,
    page: state.page,
    q: normalizeOptionalValue(state.search),
    role: role as ApiRole | undefined,
    size: state.pageSize,
    sort_by: SORT_FIELD_TO_API[sort.field],
    status,
  }
}

/** Returns whether a raw URL role is one of the roles available to the caller. */
function readAllowedRole(
  value: string | undefined,
  roles: readonly Role[],
): Role | undefined {
  return roles.includes(value as Role) ? (value as Role) : undefined
}

/** Accepts only lifecycle values supported by the backend list contract. */
function readLifecycleStatus(
  value: string | undefined,
): LifecycleStatusFilter | undefined {
  return value === 'active' || value === 'inactive' || value === 'all'
    ? value
    : undefined
}

/** Converts blank URL values to omitted API parameters. */
function normalizeOptionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}
