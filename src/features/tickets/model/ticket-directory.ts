import type {
  ListInternalTicketsApiV1TicketsInternalGetParams,
  TicketCategory,
  TicketLifecycleFilter,
  TicketSortField,
  TicketStatus,
  TicketWorkflowState,
} from '@/api/generated/models'
import type {
  DataViewSort,
  DataViewUrlConfig,
  DataViewUrlState,
} from '@/shared/data-view/data-view-url-state'
import { isIsoCalendarDate, toZonedDayBoundaryIso } from '@/shared/format/date-range'

export type TicketDirectoryFilterKey =
  | 'category'
  | 'createdFrom'
  | 'createdTo'
  | 'lifecycle'
  | 'office'
  | 'status'
  | 'updatedFrom'
  | 'updatedTo'
  | 'workflowState'

export type TicketDirectorySortField =
  | 'createdAt'
  | 'status'
  | 'title'
  | 'updatedAt'

const SORT_FIELD_TO_API: Readonly<
  Record<TicketDirectorySortField, TicketSortField>
> = {
  createdAt: 'created_at',
  status: 'status',
  title: 'title',
  updatedAt: 'updated_at',
}
const DIRECTORY_SORT_FIELDS = Object.freeze(
  Object.keys(SORT_FIELD_TO_API) as TicketDirectorySortField[],
)
const DEFAULT_SORT: DataViewSort<TicketDirectorySortField> = {
  direction: 'desc',
  field: 'updatedAt',
}

/** Creates stable URL state for the supported authority ticket filters. */
export function createTicketDirectoryUrlConfig(): DataViewUrlConfig<
  TicketDirectorySortField,
  TicketDirectoryFilterKey
> {
  return {
    defaultPageSize: 20,
    defaultSort: DEFAULT_SORT,
    filters: [
      { key: 'lifecycle' },
      { key: 'workflowState' },
      { key: 'status' },
      { key: 'category' },
      { key: 'office' },
      { key: 'createdFrom' },
      { key: 'createdTo' },
      { key: 'updatedFrom' },
      { key: 'updatedTo' },
    ],
    maxSearchLength: 200,
    pageSizeOptions: [10, 20, 50, 100],
    sortFields: DIRECTORY_SORT_FIELDS,
  }
}

/** Maps URL-owned directory state to the generated internal ticket contract. */
export function toTicketDirectoryApiParams(
  state: DataViewUrlState<
    TicketDirectorySortField,
    TicketDirectoryFilterKey
  >,
): ListInternalTicketsApiV1TicketsInternalGetParams {
  const sort = state.sort ?? DEFAULT_SORT

  return {
    category: readCategory(state.filters.category?.[0]),
    created_from: toOptionalDayBoundary(
      state.filters.createdFrom?.[0],
      'start',
    ),
    created_to: toOptionalDayBoundary(state.filters.createdTo?.[0], 'end'),
    lifecycle: readLifecycle(state.filters.lifecycle?.[0]),
    office_id: normalizeOptionalValue(state.filters.office?.[0]),
    order: sort.direction,
    page: state.page,
    q: normalizeOptionalValue(state.search),
    size: state.pageSize,
    sort_by: SORT_FIELD_TO_API[sort.field],
    status: readStatus(state.filters.status?.[0]),
    updated_from: toOptionalDayBoundary(
      state.filters.updatedFrom?.[0],
      'start',
    ),
    updated_to: toOptionalDayBoundary(state.filters.updatedTo?.[0], 'end'),
    workflow_state: readWorkflowState(state.filters.workflowState?.[0]),
  }
}

/** Normalizes the URL value so an omitted lifecycle remains the active default. */
export function getTicketLifecycleControlValue(value: string): string {
  return value === 'completed' || value === 'all' ? value : ''
}

function readLifecycle(
  value: string | undefined,
): TicketLifecycleFilter | undefined {
  return value === 'active' || value === 'completed' || value === 'all'
    ? value
    : undefined
}

function readCategory(value: string | undefined): TicketCategory | undefined {
  return value === 'INFRASTRUCTURE' ||
    value === 'CLEANING' ||
    value === 'SAFETY' ||
    value === 'NOISE' ||
    value === 'OTHER'
    ? value
    : undefined
}

function readStatus(value: string | undefined): TicketStatus | undefined {
  return value === 'OPEN' ||
    value === 'IN_PROGRESS' ||
    value === 'RESOLVED' ||
    value === 'REJECTED' ||
    value === 'CANCELLED'
    ? value
    : undefined
}

function readWorkflowState(
  value: string | undefined,
): TicketWorkflowState | undefined {
  return value === 'NEW' ||
    value === 'AWAITING_PRIMARY_ASSIGNMENT' ||
    value === 'RETURNED_TO_DISPATCH' ||
    value === 'IN_PROGRESS' ||
    value === 'WAITING_FOR_COSIGNATURE' ||
    value === 'WAITING_FOR_CITIZEN' ||
    value === 'WAITING_FOR_DECISION' ||
    value === 'COMPLETED'
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
