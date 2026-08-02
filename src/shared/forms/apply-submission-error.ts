import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'

import { isApiError } from '@/api/client/api-error'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

export type SubmissionErrorOptions<TFieldValues extends FieldValues> =
  Readonly<{
    fallbackMessage: string
    fieldAliases: Readonly<Record<string, FieldPath<TFieldValues>>>
    statusMessages?: Readonly<Record<number, string>>
  }>

/**
 * Maps backend validation details to form fields and returns remaining form-level errors.
 */
export function applySubmissionError<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  options: SubmissionErrorOptions<TFieldValues>,
): FormErrorSummaryItem[] {
  if (!isApiError(error)) {
    return [{ message: options.fallbackMessage }]
  }

  let hasUnmappedDetail = false
  let mappedFieldError = false

  for (const detail of error.details) {
    const field = detail.field ? options.fieldAliases[detail.field] : undefined

    if (!field) {
      hasUnmappedDetail = true
      continue
    }

    mappedFieldError = true
    setError(field, {
      message: detail.message,
      type: 'server',
    })
  }

  if (mappedFieldError && !hasUnmappedDetail) {
    return []
  }

  return [
    {
      message:
        options.statusMessages?.[error.status] ??
        (error.status === 0 ? error.message : options.fallbackMessage),
    },
  ]
}
