import type {
  AddressSnapshot,
  GetOfficeHistoryApiV1OfficesOfficeIdHistoryGetParams,
  OfficeHistoryResponse,
  OpeningHours,
  PaginatedResponseOfficeHistoryResponse,
} from '@/api/generated/models'
import { mapApiPage, type PageModel } from '@/api/contract/pagination'
import {
  OFFICE_WEEKDAYS,
  type OfficeOpeningHours,
} from '@/features/offices/model/office-model'
import type {
  DataViewFilterDefinition,
  DataViewUrlConfig,
  DataViewUrlState,
} from '@/shared/data-view/data-view-url-state'
import {
  isIsoCalendarDate,
  toZonedDayBoundaryIso,
} from '@/shared/format/date-range'

export type OfficeHistoryFilterKey = 'endDate' | 'startDate'
export type OfficeHistorySortField = 'changedAt'

/** Represents one immutable historical address value without resolving current data. */
export type OfficeHistoryAddress = Readonly<{
  city: string | null
  formatted: string | null
  houseNumber: string | null
  latitude: number | null
  longitude: number | null
  street: string | null
  zipCode: string | null
}>

/** Represents one immutable office snapshot after crossing the generated API boundary. */
export type OfficeHistoryRecord = Readonly<{
  address: OfficeHistoryAddress | null
  changeReason: string
  changedAt: string
  changedByUserId: string
  contactEmail: string | null
  description: string | null
  id: string
  isActive: boolean
  name: string
  officeId: string
  openingHours: OfficeOpeningHours
  phone: string | null
  services: readonly string[]
}>

const HISTORY_FILTERS: readonly DataViewFilterDefinition<OfficeHistoryFilterKey>[] = [
  { key: 'startDate' },
  { key: 'endDate' },
]

/** Creates the URL contract used by paginated office-history pages. */
export function createOfficeHistoryUrlConfig(): DataViewUrlConfig<
  OfficeHistorySortField,
  OfficeHistoryFilterKey
> {
  return {
    defaultPageSize: 20,
    filters: HISTORY_FILTERS,
    pageSizeOptions: [10, 20, 50, 100],
  }
}

/** Converts one generated history DTO into the camel-case feature model. */
export function mapOfficeHistoryResponse(
  response: OfficeHistoryResponse,
): OfficeHistoryRecord {
  return {
    address: response.address_snapshot
      ? mapOfficeHistoryAddress(response.address_snapshot)
      : null,
    changeReason: response.change_reason,
    changedAt: response.changed_at,
    changedByUserId: response.changed_by_user_id,
    contactEmail: response.contact_email ?? null,
    description: response.description ?? null,
    id: response.id,
    isActive: response.is_active,
    name: response.name,
    officeId: response.office_id,
    openingHours: mapOfficeHistoryOpeningHours(response.opening_hours),
    phone: response.phone ?? null,
    services: [...(response.services ?? [])],
  }
}

/** Maps a backend history page while preserving its pagination metadata. */
export function mapOfficeHistoryPage(
  response: PaginatedResponseOfficeHistoryResponse,
): PageModel<OfficeHistoryRecord> {
  return mapApiPage(response, mapOfficeHistoryResponse)
}

/** Reads and validates the inclusive calendar-day range owned by the history URL. */
export function getOfficeHistoryDateRange(
  state: DataViewUrlState<OfficeHistorySortField, OfficeHistoryFilterKey>,
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
export function toOfficeHistoryApiParams(
  state: DataViewUrlState<OfficeHistorySortField, OfficeHistoryFilterKey>,
): GetOfficeHistoryApiV1OfficesOfficeIdHistoryGetParams {
  const { endDate, isInvalid, startDate } = getOfficeHistoryDateRange(state)

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

/** Copies the persisted address snapshot without consulting the current office. */
function mapOfficeHistoryAddress(
  response: AddressSnapshot,
): OfficeHistoryAddress {
  return {
    city: response.city ?? null,
    formatted: response.formatted ?? null,
    houseNumber: response.house_number ?? null,
    latitude: normalizeCoordinate(response.latitude),
    longitude: normalizeCoordinate(response.longitude),
    street: response.street ?? null,
    zipCode: response.zip_code ?? null,
  }
}

/** Completes the optional transport fields with explicit values for every weekday. */
function mapOfficeHistoryOpeningHours(
  response: OpeningHours | undefined,
): OfficeOpeningHours {
  return Object.fromEntries(
    OFFICE_WEEKDAYS.map(({ key }) => [
      key,
      typeof response?.[key] === 'string' ? response[key] : null,
    ]),
  ) as OfficeOpeningHours
}

/** Rejects malformed snapshot coordinates while preserving valid zero values. */
function normalizeCoordinate(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
