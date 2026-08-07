import type {
  AppointmentSortField,
  AppointmentStatus,
  ListInternalAppointmentsApiV1AppointmentsInternalGetParams,
} from '@/api/generated/models'
import type {
  DataViewSort,
  DataViewUrlConfig,
  DataViewUrlState,
} from '@/shared/data-view/data-view-url-state'
import { isIsoCalendarDate, toZonedDayBoundaryIso } from '@/shared/format/date-range'

export type AppointmentDirectoryFilterKey =
  | 'citizen'
  | 'createdFrom'
  | 'createdTo'
  | 'startsFrom'
  | 'startsTo'
  | 'status'
  | 'ticket'

export type AppointmentDirectorySortField = 'createdAt' | 'startsAt' | 'status'

const SORT_FIELD_TO_API: Readonly<
  Record<AppointmentDirectorySortField, AppointmentSortField>
> = {
  createdAt: 'created_at',
  startsAt: 'starts_at',
  status: 'status',
}
const SORT_FIELDS = Object.freeze(
  Object.keys(SORT_FIELD_TO_API) as AppointmentDirectorySortField[],
)
const DEFAULT_SORT: DataViewSort<AppointmentDirectorySortField> = {
  direction: 'asc',
  field: 'startsAt',
}

/** Creates stable URL state for every backend-supported authority appointment filter. */
export function createAppointmentDirectoryUrlConfig(): DataViewUrlConfig<
  AppointmentDirectorySortField,
  AppointmentDirectoryFilterKey
> {
  return {
    defaultPageSize: 20,
    defaultSort: DEFAULT_SORT,
    filters: [
      { key: 'status' },
      { key: 'citizen' },
      { key: 'ticket' },
      { key: 'startsFrom' },
      { key: 'startsTo' },
      { key: 'createdFrom' },
      { key: 'createdTo' },
    ],
    maxSearchLength: 200,
    pageSizeOptions: [10, 20, 50, 100],
    sortFields: SORT_FIELDS,
  }
}

/** Maps URL-owned directory state to the generated internal appointment contract. */
export function toAppointmentDirectoryApiParams(
  state: DataViewUrlState<
    AppointmentDirectorySortField,
    AppointmentDirectoryFilterKey
  >,
): ListInternalAppointmentsApiV1AppointmentsInternalGetParams {
  const sort = state.sort ?? DEFAULT_SORT
  return {
    citizen_id: normalizeOptionalValue(state.filters.citizen?.[0]),
    created_from: toOptionalDayBoundary(state.filters.createdFrom?.[0], 'start'),
    created_to: toOptionalDayBoundary(state.filters.createdTo?.[0], 'end'),
    order: sort.direction,
    page: state.page,
    q: normalizeOptionalValue(state.search),
    size: state.pageSize,
    sort_by: SORT_FIELD_TO_API[sort.field],
    starts_from: toOptionalDayBoundary(state.filters.startsFrom?.[0], 'start'),
    starts_to: toOptionalDayBoundary(state.filters.startsTo?.[0], 'end'),
    status: readAppointmentStatus(state.filters.status?.[0]),
    ticket_id: normalizeOptionalValue(state.filters.ticket?.[0]),
  }
}

function readAppointmentStatus(
  value: string | undefined,
): AppointmentStatus | undefined {
  return value === 'SCHEDULED' ||
    value === 'CANCELLED' ||
    value === 'COMPLETED' ||
    value === 'NO_SHOW'
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
