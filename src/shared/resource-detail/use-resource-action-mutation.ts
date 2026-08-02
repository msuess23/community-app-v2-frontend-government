import {
  useMutation,
  useQueryClient,
  type MutationKey,
  type QueryKey,
  type UseMutationResult,
} from '@tanstack/react-query'

import {
  getApiErrorPresentation,
  type ApiErrorPresentationOptions,
} from '@/api/client/api-error-presentation'
import { isApiError } from '@/api/client/api-error'
import {
  useFeedback,
  type FeedbackInput,
} from '@/shared/feedback/feedback-context'
import {
  commitMutationResult,
  refreshQueryKeys,
} from '@/shared/remote-data/mutation-cache'

export type ResourceActionCachePlan = Readonly<{
  detailKey?: QueryKey
  invalidate?: ReadonlyArray<QueryKey>
}>

export type ResourceActionSuccessFeedback = Omit<FeedbackInput, 'tone'>

export interface ResourceActionMutationOptions<TData, TVariables> {
  conflictQueryKeys?: (
    variables: TVariables,
  ) => ReadonlyArray<QueryKey>
  errorPresentation?: ApiErrorPresentationOptions
  getCachePlan?: (
    data: TData,
    variables: TVariables,
  ) => ResourceActionCachePlan
  mutationFn: (variables: TVariables) => Promise<TData>
  mutationKey?: MutationKey
  onError?: (error: unknown, variables: TVariables) => Promise<void> | void
  onSuccess?: (data: TData, variables: TVariables) => Promise<void> | void
  successFeedback:
    | ResourceActionSuccessFeedback
    | ((data: TData, variables: TVariables) => ResourceActionSuccessFeedback)
}

/** Executes a resource command and synchronizes server-confirmed projections consistently. */
export function useResourceActionMutation<TData, TVariables>(
  options: ResourceActionMutationOptions<TData, TVariables>,
): UseMutationResult<TData, unknown, TVariables> {
  const queryClient = useQueryClient()
  const { notify } = useFeedback()

  return useMutation<TData, unknown, TVariables>({
    mutationFn: options.mutationFn,
    mutationKey: options.mutationKey,
    onError: async (error, variables) => {
      const isConflict = isApiError(error) && error.status === 409

      if (isConflict) {
        const conflictKeys = options.conflictQueryKeys?.(variables) ?? []
        // A failed refresh must not suppress the original conflict feedback.
        await refreshQueryKeys(queryClient, conflictKeys).catch(() => undefined)
      }

      const presentation = getApiErrorPresentation(
        error,
        options.errorPresentation,
      )
      notify({
        autoDismissAfter: null,
        dedupeKey: createActionErrorDedupeKey(error),
        description: presentation.description,
        title: presentation.title,
        tone: isConflict ? 'warning' : 'error',
      })

      await options.onError?.(error, variables)
    },
    onSuccess: async (data, variables) => {
      const cachePlan = options.getCachePlan?.(data, variables)

      if (cachePlan) {
        await commitMutationResult(queryClient, {
          data,
          detailKey: cachePlan.detailKey,
          invalidate: cachePlan.invalidate,
        })
      }

      const feedback =
        typeof options.successFeedback === 'function'
          ? options.successFeedback(data, variables)
          : options.successFeedback
      notify({ ...feedback, tone: 'success' })

      await options.onSuccess?.(data, variables)
    },
  })
}

/** Groups repeated failures without exposing technical backend content to users. */
function createActionErrorDedupeKey(error: unknown): string {
  if (!isApiError(error)) {
    return 'resource-action:error:unknown'
  }

  return `resource-action:error:${error.errorCode ?? error.status}`
}
