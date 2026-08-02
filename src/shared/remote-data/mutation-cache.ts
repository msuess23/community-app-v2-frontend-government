import type { QueryClient, QueryKey } from '@tanstack/react-query'

type MutationQueryClient = Pick<
  QueryClient,
  'cancelQueries' | 'invalidateQueries' | 'setQueryData'
>

export type MutationCachePlan<TData> = Readonly<{
  data: TData
  detailKey?: QueryKey
  invalidate?: ReadonlyArray<QueryKey>
}>

/** Commits a server-confirmed mutation result before refreshing related views. */
export async function commitMutationResult<TData>(
  queryClient: MutationQueryClient,
  { data, detailKey, invalidate = [] }: MutationCachePlan<TData>,
): Promise<void> {
  if (detailKey) {
    // Stop an older detail request before it can overwrite the mutation response.
    await queryClient.cancelQueries({ exact: true, queryKey: detailKey })
    queryClient.setQueryData(detailKey, data)
  }

  await Promise.all(
    invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  )
}

/** Invalidates current server projections after a conflict or external change. */
export async function refreshQueryKeys(
  queryClient: MutationQueryClient,
  queryKeys: ReadonlyArray<QueryKey>,
): Promise<void> {
  await Promise.all(
    queryKeys.map(async (queryKey) => {
      await queryClient.cancelQueries({ queryKey })
      await queryClient.invalidateQueries({ queryKey })
    }),
  )
}
