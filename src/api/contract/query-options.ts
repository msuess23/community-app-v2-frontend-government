import {
  queryOptions,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query'

import type { ApiResponseMapper } from '@/api/contract/mapper'

export type MappedQueryConfig<TDto, TModel, TError = Error> = Readonly<{
  map: ApiResponseMapper<TDto, TModel>
  queryFn: (signal: AbortSignal) => Promise<TDto>
  queryKey: QueryKey
  options?: Omit<
    UseQueryOptions<TModel, TError, TModel, QueryKey>,
    'queryFn' | 'queryKey' | 'select'
  >
}>

/** Creates TanStack Query options that map generated DTOs at the feature boundary. */
export function createMappedQueryOptions<TDto, TModel, TError = Error>({
  map,
  options,
  queryFn,
  queryKey,
}: MappedQueryConfig<TDto, TModel, TError>) {
  return queryOptions({
    ...options,
    queryKey,
    queryFn: async ({ signal }) => map(await queryFn(signal)),
  })
}
