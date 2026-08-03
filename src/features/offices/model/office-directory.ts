import type {
  GetAllOfficesApiV1OfficesGetParams,
  LifecycleStatusFilter,
  OfficeSortField,
} from '@/api/generated/models'
import type { Role } from '@/auth/auth-types'
import type {
  DataViewSort,
  DataViewUrlConfig,
  DataViewUrlState,
} from '@/shared/data-view/data-view-url-state'

export type OfficeDirectoryFilterKey = 'status'
export type OfficeDirectorySortField = 'contactEmail' | 'createdAt' | 'name'

export type OfficeDirectoryAccess = Readonly<{
  canFilterByStatus: boolean
}>

const SORT_FIELD_TO_API: Readonly<
  Record<OfficeDirectorySortField, OfficeSortField>
> = {
  contactEmail: 'contact_email',
  createdAt: 'created_at',
  name: 'name',
}
const DIRECTORY_SORT_FIELDS = Object.freeze(
  Object.keys(SORT_FIELD_TO_API) as OfficeDirectorySortField[],
)
const DEFAULT_SORT: DataViewSort<OfficeDirectorySortField> = {
  direction: 'asc',
  field: 'name',
}

/** Describes which office-directory filters the backend permits for one role. */
export function getOfficeDirectoryAccess(role: Role): OfficeDirectoryAccess {
  return { canFilterByStatus: role === 'ADMIN' }
}

/** Creates stable URL-state configuration for the caller's permitted filters. */
export function createOfficeDirectoryUrlConfig(
  access: OfficeDirectoryAccess,
): DataViewUrlConfig<OfficeDirectorySortField, OfficeDirectoryFilterKey> {
  return {
    defaultPageSize: 20,
    defaultSort: DEFAULT_SORT,
    filters: access.canFilterByStatus ? [{ key: 'status' }] : [],
    pageSizeOptions: [10, 20, 50, 100],
    sortFields: DIRECTORY_SORT_FIELDS,
  }
}

/** Maps URL-owned directory state to the generated office list contract. */
export function toOfficeDirectoryApiParams(
  state: DataViewUrlState<OfficeDirectorySortField, OfficeDirectoryFilterKey>,
  access: OfficeDirectoryAccess,
): GetAllOfficesApiV1OfficesGetParams {
  const sort = state.sort ?? DEFAULT_SORT
  const selectedStatus = access.canFilterByStatus
    ? readLifecycleStatus(state.filters.status?.[0])
    : undefined

  return {
    order: sort.direction,
    page: state.page,
    q: normalizeOptionalValue(state.search),
    size: state.pageSize,
    sort_by: SORT_FIELD_TO_API[sort.field],
    status: selectedStatus ?? 'active',
  }
}

/** Accepts only lifecycle values supported by the backend office list. */
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
