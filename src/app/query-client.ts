import { QueryClient } from '@tanstack/react-query'

import { isApiError } from '@/api/client/api-error'
import { isAbortError } from '@/api/client/request-error'

const RETRYABLE_HTTP_STATUSES = new Set([408, 500, 502, 503, 504])
const MAX_QUERY_RETRIES = 1

/** Decides whether a failed read request is safe and useful to repeat. */
export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= MAX_QUERY_RETRIES || isAbortError(error)) {
    return false
  }

  if (!isApiError(error)) {
    return false
  }

  return error.status === 0 || RETRYABLE_HTTP_STATUSES.has(error.status)
}

/** Creates the shared TanStack Query client used by the authenticated app. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 5 * 60_000,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
        retryDelay: (attemptIndex: number) =>
          Math.min(1_000 * 2 ** attemptIndex, 4_000),
        staleTime: 30_000,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const queryClient = createQueryClient()
