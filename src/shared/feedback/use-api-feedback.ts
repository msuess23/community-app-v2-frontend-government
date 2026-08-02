import { useCallback } from 'react'

import {
  getApiErrorPresentation,
  type ApiErrorPresentationOptions,
} from '@/api/client/api-error-presentation'
import { useFeedback } from '@/shared/feedback/feedback-context'

export type ApiFeedbackOptions = ApiErrorPresentationOptions &
  Readonly<{
    dedupeKey?: string
  }>

/** Returns a reporter that displays safe API failures through global feedback. */
export function useApiFeedback(): (
  error: unknown,
  options?: ApiFeedbackOptions,
) => string {
  const { notify } = useFeedback()

  return useCallback(
    (error: unknown, options: ApiFeedbackOptions = {}): string => {
      const presentation = getApiErrorPresentation(error, options)

      return notify({
        dedupeKey: options.dedupeKey,
        description: presentation.description,
        title: presentation.title,
        tone: 'error',
      })
    },
    [notify],
  )
}
