import type {
  AppointmentSlotSortField,
  AppointmentSlotStatus,
  ListAppointmentSlotsApiV1OfficesOfficeIdAppointmentSlotsGetParams,
} from '@/api/generated/models'
import type {
  DataViewSort,
  DataViewUrlConfig,
  DataViewUrlState,
} from '@/shared/data-view/data-view-url-state'
import { isIsoCalendarDate, toZonedDayBoundaryIso } from '@/shared/format/date-range'

export type AppointmentSlotDirectoryFilterKey =
  | 'startsFrom'
  | 'startsTo'
  | 'status'

export type AppointmentSlotDirectorySortField =
  | 'createdAt'
  | 'startsAt'
  | 'status'

const SORT_FIELD_TO_API: Readonly<
  Record<AppointmentSlotDirectorySortField, AppointmentSlotSortField>
> = {
  createdAt: 'created_at',
  startsAt: 'starts_at',
  status: 'status',
}
const SORT_FIELDS = Object.freeze(
  Object.keys(SORT_FIELD_TO_API) as AppointmentSlotDirectorySortField[],
)
const DEFAULT_SORT: DataViewSort<AppointmentSlotDirectorySortField> = {
  direction: 'asc',
  field: 'startsAt',
}

/** Creates stable URL state for every backend-supported authority slot filter. */
export function createAppointmentSlotDirectoryUrlConfig(): DataViewUrlConfig<
  AppointmentSlotDirectorySortField,
  AppointmentSlotDirectoryFilterKey
> {
  return {
    defaultPageSize: 20,
    defaultSort: DEFAULT_SORT,
    filters: [{ key: 'status' }, { key: 'startsFrom' }, { key: 'startsTo' }],
    pageSizeOptions: [10, 20, 50, 100],
    sortFields: SORT_FIELDS,
  }
}

/** Maps URL-owned slot-directory state to the generated backend contract. */
export function toAppointmentSlotDirectoryApiParams(
  state: DataViewUrlState<
    AppointmentSlotDirectorySortField,
    AppointmentSlotDirectoryFilterKey
  >,
): ListAppointmentSlotsApiV1OfficesOfficeIdAppointmentSlotsGetParams {
  const sort = state.sort ?? DEFAULT_SORT

  return {
    order: sort.direction,
    page: state.page,
    size: state.pageSize,
    sort_by: SORT_FIELD_TO_API[sort.field],
    starts_from: toOptionalDayBoundary(state.filters.startsFrom?.[0], 'start'),
    starts_to: toOptionalDayBoundary(state.filters.startsTo?.[0], 'end'),
    status: readAppointmentSlotStatus(state.filters.status?.[0]),
  }
}

function readAppointmentSlotStatus(
  value: string | undefined,
): AppointmentSlotStatus | undefined {
  return value === 'AVAILABLE' ||
    value === 'BOOKED' ||
    value === 'INACTIVE' ||
    value === 'CONSUMED'
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
