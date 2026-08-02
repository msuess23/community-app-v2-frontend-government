import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

export type DataViewSortDirection = 'asc' | 'desc'

export type DataViewFilterDefinition<TFilterKey extends string> = Readonly<{
  key: TFilterKey
  multiple?: boolean
}>

export type DataViewSort<TSortField extends string> = Readonly<{
  direction: DataViewSortDirection
  field: TSortField
}>

export type DataViewUrlConfig<
  TSortField extends string,
  TFilterKey extends string,
> = Readonly<{
  defaultPageSize: number
  defaultSort?: DataViewSort<TSortField>
  filters?: readonly DataViewFilterDefinition<TFilterKey>[]
  pageSizeOptions: readonly number[]
  sortFields?: readonly TSortField[]
}>

export type DataViewUrlState<
  TSortField extends string,
  TFilterKey extends string,
> = Readonly<{
  filters: Readonly<Record<TFilterKey, readonly string[]>>
  page: number
  pageSize: number
  search: string
  sort: DataViewSort<TSortField> | null
}>

export type DataViewUrlUpdate<
  TSortField extends string,
  TFilterKey extends string,
> = Readonly<{
  filters?: Partial<Record<TFilterKey, string | readonly string[] | null>>
  page?: number
  pageSize?: number
  search?: string
  sort?: DataViewSort<TSortField> | null
}>

type DataViewUrlUpdateOptions = Readonly<{
  resetPage?: boolean
}>

const PAGE_PARAM = 'page'
const PAGE_SIZE_PARAM = 'size'
const SEARCH_PARAM = 'search'
const SORT_DIRECTION_PARAM = 'sortDirection'
const SORT_FIELD_PARAM = 'sortBy'

/** Reads a normalized list-view state from URL search parameters. */
export function parseDataViewUrlState<
  TSortField extends string,
  TFilterKey extends string,
>(
  searchParams: URLSearchParams,
  config: DataViewUrlConfig<TSortField, TFilterKey>,
): DataViewUrlState<TSortField, TFilterKey> {
  return {
    filters: parseFilters(searchParams, config.filters ?? []),
    page: parsePositiveInteger(searchParams.get(PAGE_PARAM), 1),
    pageSize: parsePageSize(searchParams.get(PAGE_SIZE_PARAM), config),
    search: searchParams.get(SEARCH_PARAM)?.trim() ?? '',
    sort: parseSort(searchParams, config),
  }
}

/** Applies one list-view update while preserving unrelated URL parameters. */
export function createDataViewSearchParams<
  TSortField extends string,
  TFilterKey extends string,
>(
  currentSearchParams: URLSearchParams,
  config: DataViewUrlConfig<TSortField, TFilterKey>,
  update: DataViewUrlUpdate<TSortField, TFilterKey>,
  options: DataViewUrlUpdateOptions = {},
): URLSearchParams {
  const currentState = parseDataViewUrlState(currentSearchParams, config)
  const nextState: DataViewUrlState<TSortField, TFilterKey> = {
    filters: mergeFilters(currentState.filters, update.filters),
    page:
      options.resetPage === true
        ? 1
        : normalizePositiveInteger(update.page ?? currentState.page, 1),
    pageSize: normalizePageSize(
      update.pageSize ?? currentState.pageSize,
      config,
    ),
    search: normalizeSearch(update.search ?? currentState.search),
    sort: normalizeSort(
      update.sort === undefined ? currentState.sort : update.sort,
      config,
    ),
  }
  const nextSearchParams = new URLSearchParams(currentSearchParams)

  clearOwnedParams(nextSearchParams, config.filters ?? [])
  serializeState(nextSearchParams, nextState, config)

  return nextSearchParams
}

/** Connects a server-driven list view to stable, shareable URL state. */
export function useDataViewUrlState<
  TSortField extends string,
  TFilterKey extends string,
>(config: DataViewUrlConfig<TSortField, TFilterKey>) {
  const [searchParams, setSearchParams] = useSearchParams()
  const state = useMemo(
    () => parseDataViewUrlState(searchParams, config),
    [config, searchParams],
  )

  const update = useCallback(
    (
      nextUpdate: DataViewUrlUpdate<TSortField, TFilterKey>,
      options?: DataViewUrlUpdateOptions,
    ) => {
      setSearchParams((current) =>
        createDataViewSearchParams(current, config, nextUpdate, options),
      )
    },
    [config, setSearchParams],
  )

  const setFilter = useCallback(
    (key: TFilterKey, value: string | readonly string[] | null) => {
      const filters = { [key]: value } as Partial<
        Record<TFilterKey, string | readonly string[] | null>
      >
      update({ filters }, { resetPage: true })
    },
    [update],
  )

  const resetFilters = useCallback(() => {
    const clearedFilters = Object.fromEntries(
      (config.filters ?? []).map(({ key }) => [key, null]),
    ) as Partial<Record<TFilterKey, null>>

    update(
      {
        filters: clearedFilters,
        search: '',
      },
      { resetPage: true },
    )
  }, [config.filters, update])

  return {
    hasActiveFilters:
      state.search.length > 0 ||
      (config.filters ?? []).some(
        ({ key }) => (state.filters[key]?.length ?? 0) > 0,
      ),
    resetFilters,
    setFilter,
    setPage: (page: number) => update({ page }),
    setPageSize: (pageSize: number) =>
      update({ pageSize }, { resetPage: true }),
    setSearch: (search: string) => update({ search }, { resetPage: true }),
    setSort: (sort: DataViewSort<TSortField> | null) =>
      update({ sort }, { resetPage: true }),
    state,
    update,
  }
}

/** Returns the first selected value for a single-value filter. */
export function getSingleFilterValue<
  TFilterKey extends string,
  TSortField extends string,
>(
  state: DataViewUrlState<TSortField, TFilterKey>,
  key: TFilterKey,
): string {
  return state.filters[key]?.[0] ?? ''
}

/** Reads configured single- and multi-value filters from the URL. */
function parseFilters<TFilterKey extends string>(
  searchParams: URLSearchParams,
  definitions: readonly DataViewFilterDefinition<TFilterKey>[],
): Readonly<Record<TFilterKey, readonly string[]>> {
  return Object.fromEntries(
    definitions.map(({ key, multiple }) => {
      const rawValues = multiple
        ? searchParams.getAll(key)
        : [searchParams.get(key)]

      return [key, normalizeFilterValues(rawValues)]
    }),
  ) as Record<TFilterKey, readonly string[]>
}

/** Accepts only sorting fields and directions declared by the feature. */
function parseSort<TSortField extends string, TFilterKey extends string>(
  searchParams: URLSearchParams,
  config: DataViewUrlConfig<TSortField, TFilterKey>,
): DataViewSort<TSortField> | null {
  const field = searchParams.get(SORT_FIELD_PARAM)
  const direction = searchParams.get(SORT_DIRECTION_PARAM)

  if (
    field !== null &&
    config.sortFields?.includes(field as TSortField) &&
    isSortDirection(direction)
  ) {
    return { direction, field: field as TSortField }
  }

  return config.defaultSort ?? null
}

/** Writes non-default list state into a shareable query string. */
function serializeState<TSortField extends string, TFilterKey extends string>(
  searchParams: URLSearchParams,
  state: DataViewUrlState<TSortField, TFilterKey>,
  config: DataViewUrlConfig<TSortField, TFilterKey>,
): void {
  if (state.page > 1) {
    searchParams.set(PAGE_PARAM, String(state.page))
  }

  if (state.pageSize !== config.defaultPageSize) {
    searchParams.set(PAGE_SIZE_PARAM, String(state.pageSize))
  }

  if (state.search.length > 0) {
    searchParams.set(SEARCH_PARAM, state.search)
  }

  if (!isDefaultSort(state.sort, config.defaultSort) && state.sort !== null) {
    searchParams.set(SORT_FIELD_PARAM, state.sort.field)
    searchParams.set(SORT_DIRECTION_PARAM, state.sort.direction)
  }

  for (const definition of config.filters ?? []) {
    const values = state.filters[definition.key] ?? []
    const serializedValues = definition.multiple ? values : values.slice(0, 1)

    for (const value of serializedValues) {
      searchParams.append(definition.key, value)
    }
  }
}

/** Removes only parameters managed by the current list view. */
function clearOwnedParams<TFilterKey extends string>(
  searchParams: URLSearchParams,
  definitions: readonly DataViewFilterDefinition<TFilterKey>[],
): void {
  for (const name of [
    PAGE_PARAM,
    PAGE_SIZE_PARAM,
    SEARCH_PARAM,
    SORT_FIELD_PARAM,
    SORT_DIRECTION_PARAM,
    ...definitions.map(({ key }) => key),
  ]) {
    searchParams.delete(name)
  }
}

/** Merges a partial filter update without mutating the current state. */
function mergeFilters<TFilterKey extends string>(
  current: Readonly<Record<TFilterKey, readonly string[]>>,
  update?: Partial<
    Record<TFilterKey, string | readonly string[] | null>
  >,
): Readonly<Record<TFilterKey, readonly string[]>> {
  if (update === undefined) {
    return current
  }

  const next: Record<TFilterKey, readonly string[]> = { ...current }

  for (const [key, value] of Object.entries(update) as [
    TFilterKey,
    string | readonly string[] | null,
  ][]) {
    next[key] = normalizeFilterValues(
      value === null ? [] : Array.isArray(value) ? value : [value],
    )
  }

  return next
}

/** Resolves a URL page size against the feature's allowed options. */
function parsePageSize<TSortField extends string, TFilterKey extends string>(
  value: string | null,
  config: DataViewUrlConfig<TSortField, TFilterKey>,
): number {
  const parsed = Number(value)

  return Number.isInteger(parsed) && config.pageSizeOptions.includes(parsed)
    ? parsed
    : config.defaultPageSize
}

/** Falls back when a requested page size is not supported. */
function normalizePageSize<
  TSortField extends string,
  TFilterKey extends string,
>(
  value: number,
  config: DataViewUrlConfig<TSortField, TFilterKey>,
): number {
  return config.pageSizeOptions.includes(value) ? value : config.defaultPageSize
}

/** Parses a positive integer from an optional query-string value. */
function parsePositiveInteger(value: string | null, fallback: number): number {
  return normalizePositiveInteger(Number(value), fallback)
}

/** Rejects non-integer and non-positive pagination values. */
function normalizePositiveInteger(value: number, fallback: number): number {
  return Number.isInteger(value) && value > 0 ? value : fallback
}

/** Removes surrounding whitespace before persisting a search term. */
function normalizeSearch(value: string): string {
  return value.trim()
}

/** Trims, removes empty entries and deduplicates filter values. */
function normalizeFilterValues(
  values: readonly (string | null)[],
): readonly string[] {
  return [
    ...new Set(
      values.flatMap((value) => {
        const normalized = value?.trim() ?? ''
        return normalized.length > 0 ? [normalized] : []
      }),
    ),
  ]
}

/** Replaces unsupported sorting with the configured default. */
function normalizeSort<TSortField extends string, TFilterKey extends string>(
  sort: DataViewSort<TSortField> | null,
  config: DataViewUrlConfig<TSortField, TFilterKey>,
): DataViewSort<TSortField> | null {
  if (
    sort === null ||
    !config.sortFields?.includes(sort.field) ||
    !isSortDirection(sort.direction)
  ) {
    return config.defaultSort ?? null
  }

  return sort
}

/** Narrows unknown input to a supported sort direction. */
function isSortDirection(value: unknown): value is DataViewSortDirection {
  return value === 'asc' || value === 'desc'
}

/** Checks whether sorting can be omitted from the URL as a default. */
function isDefaultSort<TSortField extends string>(
  sort: DataViewSort<TSortField> | null,
  defaultSort?: DataViewSort<TSortField>,
): boolean {
  return (
    sort !== null &&
    defaultSort !== undefined &&
    sort.field === defaultSort.field &&
    sort.direction === defaultSort.direction
  )
}
