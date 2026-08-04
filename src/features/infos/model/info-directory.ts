import type {
  InfoCategory,
  InfoSortField,
  InfoStatus,
  ListInfosApiV1InfosGetParams,
} from '@/api/generated/models'
import type {
  DataViewSort,
  DataViewUrlConfig,
  DataViewUrlState,
} from '@/shared/data-view/data-view-url-state'
import { isIsoCalendarDate, toZonedDayBoundaryIso } from '@/shared/format/date-range'

export type InfoDirectoryFilterKey =
  | 'category'
  | 'endsTo'
  | 'office'
  | 'startsFrom'
  | 'status'
export type InfoDirectorySortField =
  | 'createdAt'
  | 'endsAt'
  | 'startsAt'
  | 'title'
  | 'updatedAt'

const SORT_FIELD_TO_API: Readonly<Record<InfoDirectorySortField, InfoSortField>> = {
  createdAt: 'created_at',
  endsAt: 'ends_at',
  startsAt: 'starts_at',
  title: 'title',
  updatedAt: 'updated_at',
}
const DIRECTORY_SORT_FIELDS = Object.freeze(
  Object.keys(SORT_FIELD_TO_API) as InfoDirectorySortField[],
)
const DEFAULT_SORT: DataViewSort<InfoDirectorySortField> = {
  direction: 'asc',
  field: 'startsAt',
}

/** Creates stable URL-state configuration for every supported non-geographic filter. */
export function createInfoDirectoryUrlConfig(): DataViewUrlConfig<
  InfoDirectorySortField,
  InfoDirectoryFilterKey
> {
  return {
    defaultPageSize: 20,
    defaultSort: DEFAULT_SORT,
    filters: [
      { key: 'office' },
      { key: 'category' },
      { key: 'status' },
      { key: 'startsFrom' },
      { key: 'endsTo' },
    ],
    pageSizeOptions: [10, 20, 50, 100],
    sortFields: DIRECTORY_SORT_FIELDS,
  }
}

/** Maps URL-owned directory state to the generated Info list contract. */
export function toInfoDirectoryApiParams(
  state: DataViewUrlState<InfoDirectorySortField, InfoDirectoryFilterKey>,
): ListInfosApiV1InfosGetParams {
  const sort = state.sort ?? DEFAULT_SORT

  return {
    category: readCategory(state.filters.category?.[0]),
    ends_to: toOptionalDayBoundary(state.filters.endsTo?.[0], 'end'),
    office_id: normalizeOptionalValue(state.filters.office?.[0]),
    order: sort.direction,
    page: state.page,
    q: normalizeOptionalValue(state.search),
    size: state.pageSize,
    sort_by: SORT_FIELD_TO_API[sort.field],
    starts_from: toOptionalDayBoundary(state.filters.startsFrom?.[0], 'start'),
    status: readStatus(state.filters.status?.[0]),
  }
}

function readCategory(value: string | undefined): InfoCategory | undefined {
  return value === 'EVENT' ||
    value === 'CONSTRUCTION' ||
    value === 'MAINTENANCE' ||
    value === 'ANNOUNCEMENT' ||
    value === 'OTHER'
    ? value
    : undefined
}

function readStatus(value: string | undefined): InfoStatus | undefined {
  return value === 'SCHEDULED' ||
    value === 'ACTIVE' ||
    value === 'DONE' ||
    value === 'CANCELLED'
    ? value
    : undefined
}

function toOptionalDayBoundary(
  value: string | undefined,
  boundary: 'end' | 'start',
): string | undefined {
  return value && isIsoCalendarDate(value)
    ? toZonedDayBoundaryIso(value, boundary)
    : undefined
}

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}
