import type { UseFormSetError } from 'react-hook-form'
import { z } from 'zod'

import type { AuthUser, UpdateCurrentUserInput } from '@/auth/auth-types'
import { applySubmissionError } from '@/shared/forms/apply-submission-error'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

export const accountProfileFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'Der Vorname muss mindestens zwei Zeichen haben.')
    .max(100, 'Der Vorname darf höchstens 100 Zeichen haben.'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Der Nachname muss mindestens zwei Zeichen haben.')
    .max(100, 'Der Nachname darf höchstens 100 Zeichen haben.'),
})

export type AccountProfileFormValues = z.infer<typeof accountProfileFormSchema>

/** Creates editable profile values from the authenticated user snapshot. */
export function toAccountProfileFormValues(
  user: AuthUser,
): AccountProfileFormValues {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
  }
}

/** Converts validated form values into the backend profile update contract. */
export function toUpdateCurrentUserInput(
  values: AccountProfileFormValues,
): UpdateCurrentUserInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
  }
}

/** Maps profile update failures to editable fields or a safe form-level message. */
export function applyAccountProfileSubmissionError(
  error: unknown,
  setError: UseFormSetError<AccountProfileFormValues>,
): FormErrorSummaryItem[] {
  return applySubmissionError<AccountProfileFormValues>(error, setError, {
    fallbackMessage:
      'Die Profildaten konnten nicht gespeichert werden. Versuche es erneut.',
    fieldAliases: {
      first_name: 'firstName',
      firstName: 'firstName',
      last_name: 'lastName',
      lastName: 'lastName',
    },
    statusMessages: {
      403: 'Du darfst diese Profildaten nicht ändern.',
      409: 'Die Profildaten wurden zwischenzeitlich geändert. Lade die Seite neu und versuche es erneut.',
    },
  })
}
