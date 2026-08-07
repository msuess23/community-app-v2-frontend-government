import type {
  GetUserHistoryApiV1UsersUserIdHistoryGetParams,
  PaginatedResponseUserHistoryResponse,
  UserHistoryResponse,
} from '@/api/generated/models'
import type { Role } from '@/auth/auth-types'
import { mapApiPage, type PageModel } from '@/api/contract/pagination'
import type {
  DataViewFilterDefinition,
  DataViewUrlConfig,
  DataViewUrlState,
} from '@/shared/data-view/data-view-url-state'
import {
  isIsoCalendarDate,
  toZonedDayBoundaryIso,
} from '@/shared/format/date-range'

export type UserHistoryFilterKey = 'endDate' | 'startDate'
export type UserHistorySortField = 'changedAt'

/** Represents one immutable user snapshot after it crosses the generated API boundary. */
export type UserHistoryRecord = Readonly<{
  changeReason: string
  changedAt: string
  changedByUserId: string
  email: string
  firstName: string
  id: string
  isActive: boolean
  lastName: string
  officeId: string | null
  role: Role
  userId: string
}>

const HISTORY_FILTERS: readonly DataViewFilterDefinition<UserHistoryFilterKey>[] = [
  { key: 'startDate' },
  { key: 'endDate' },
]

/** Creates the URL contract used by paginated user-history pages. */
export function createUserHistoryUrlConfig(): DataViewUrlConfig<
  UserHistorySortField,
  UserHistoryFilterKey
> {
  return {
    defaultPageSize: 20,
    filters: HISTORY_FILTERS,
    pageSizeOptions: [10, 20, 50, 100],
  }
}

/** Converts one generated history DTO into the camel-case feature model. */
export function mapUserHistoryResponse(
  response: UserHistoryResponse,
): UserHistoryRecord {
  return {
    changeReason: response.change_reason,
    changedAt: response.changed_at,
    changedByUserId: response.changed_by_user_id,
    email: response.email,
    firstName: response.first_name,
    id: response.id,
    isActive: response.is_active,
    lastName: response.last_name,
    officeId: response.office_id ?? null,
    role: response.role,
    userId: response.user_id,
  }
}

/** Maps a backend history page while preserving its pagination metadata. */
export function mapUserHistoryPage(
  response: PaginatedResponseUserHistoryResponse,
): PageModel<UserHistoryRecord> {
  const page = mapApiPage(response, mapUserHistoryResponse)
  return {
    ...page,
    items: [...page.items].sort(compareUserHistoryNewestFirst),
  }
}

/** Keeps the most recent immutable account snapshots at the top of each page. */
function compareUserHistoryNewestFirst(
  left: UserHistoryRecord,
  right: UserHistoryRecord,
): number {
  return Date.parse(right.changedAt) - Date.parse(left.changedAt)
}

/** Reads and validates the inclusive calendar-day range owned by the history URL. */
export function getUserHistoryDateRange(
  state: DataViewUrlState<UserHistorySortField, UserHistoryFilterKey>,
): Readonly<{
  endDate: string
  isInvalid: boolean
  startDate: string
}> {
  const startDate = state.filters.startDate?.[0] ?? ''
  const endDate = state.filters.endDate?.[0] ?? ''
  const startDateIsValid = !startDate || isIsoCalendarDate(startDate)
  const endDateIsValid = !endDate || isIsoCalendarDate(endDate)

  return {
    endDate,
    isInvalid:
      !startDateIsValid ||
      !endDateIsValid ||
      (startDate.length > 0 && endDate.length > 0 && startDate > endDate),
    startDate,
  }
}

/** Converts URL-owned calendar dates to timezone-aware backend query parameters. */
export function toUserHistoryApiParams(
  state: DataViewUrlState<UserHistorySortField, UserHistoryFilterKey>,
): GetUserHistoryApiV1UsersUserIdHistoryGetParams {
  const { endDate, isInvalid, startDate } = getUserHistoryDateRange(state)

  return {
    end_date:
      !isInvalid && endDate
        ? toZonedDayBoundaryIso(endDate, 'end')
        : undefined,
    page: state.page,
    size: state.pageSize,
    start_date:
      !isInvalid && startDate
        ? toZonedDayBoundaryIso(startDate, 'start')
        : undefined,
  }
}
