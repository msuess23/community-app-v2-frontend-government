import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'
import { z } from 'zod'

import { isApiError } from '@/api/client/api-error'
import { authEmailSchema, authPasswordSchema } from '@/auth/auth-field-schemas'
import type {
  RequestPasswordResetInput,
  ResetPasswordInput,
} from '@/auth/auth-types'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

export const requestPasswordResetFormSchema = z.object({
  email: authEmailSchema,
})

export const resetPasswordFormSchema = z
  .object({
    email: authEmailSchema,
    newPassword: authPasswordSchema,
    otp: z
      .string()
      .trim()
      .regex(
        /^\d{6}$/u,
        'Der Einmalcode muss aus genau sechs Ziffern bestehen.',
      ),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.newPassword === values.passwordConfirmation, {
    message: 'Die Passwörter stimmen nicht überein.',
    path: ['passwordConfirmation'],
  })

export type RequestPasswordResetFormValues = z.infer<
  typeof requestPasswordResetFormSchema
>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>

export function toRequestPasswordResetInput(
  values: RequestPasswordResetFormValues,
): RequestPasswordResetInput {
  return { email: normalizeEmail(values.email) }
}

export function toResetPasswordInput(
  values: ResetPasswordFormValues,
): ResetPasswordInput {
  return {
    email: normalizeEmail(values.email),
    newPassword: values.newPassword,
    otp: values.otp.trim(),
  }
}

export function applyRequestPasswordResetError(
  error: unknown,
  setError: UseFormSetError<RequestPasswordResetFormValues>,
): FormErrorSummaryItem[] {
  return applyRecoveryError(error, setError, {
    fallbackMessage:
      'Der Einmalcode konnte nicht angefordert werden. Bitte versuche es später erneut.',
    fieldAliases: { email: 'email' },
    statusMessages: {},
  })
}

export function applyResetPasswordError(
  error: unknown,
  setError: UseFormSetError<ResetPasswordFormValues>,
): FormErrorSummaryItem[] {
  return applyRecoveryError(error, setError, {
    fallbackMessage: 'Das Passwort konnte nicht geändert werden.',
    fieldAliases: {
      email: 'email',
      new_password: 'newPassword',
      newPassword: 'newPassword',
      otp: 'otp',
      password: 'newPassword',
    },
    statusMessages: {
      400: 'Der Einmalcode ist ungültig oder abgelaufen.',
    },
  })
}

type RecoveryErrorOptions<TFieldValues extends FieldValues> = Readonly<{
  fallbackMessage: string
  fieldAliases: Readonly<Record<string, FieldPath<TFieldValues>>>
  statusMessages: Readonly<Record<number, string>>
}>

function applyRecoveryError<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  options: RecoveryErrorOptions<TFieldValues>,
): FormErrorSummaryItem[] {
  if (!isApiError(error)) {
    return [{ message: options.fallbackMessage }]
  }

  let mappedFieldError = false
  let hasUnmappedDetail = false

  for (const detail of error.details) {
    const field = detail.field ? options.fieldAliases[detail.field] : undefined

    if (!field) {
      hasUnmappedDetail = true
      continue
    }

    mappedFieldError = true
    setError(field, { message: detail.message, type: 'server' })
  }

  if (mappedFieldError && !hasUnmappedDetail) {
    return []
  }

  return [
    {
      message:
        options.statusMessages[error.status] ??
        (error.status === 0 ? error.message : options.fallbackMessage),
    },
  ]
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
