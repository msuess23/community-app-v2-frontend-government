import type { UseFormSetError } from 'react-hook-form'
import { z } from 'zod'

import { authEmailSchema, authPasswordSchema } from '@/auth/auth-field-schemas'
import type { LoginInput, RegisterInput } from '@/auth/auth-types'
import { applySubmissionError } from '@/shared/forms/apply-submission-error'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

export const loginFormSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(1, 'Bitte gib dein Passwort ein.'),
  rememberMe: z.boolean(),
})

export const registerFormSchema = z
  .object({
    email: authEmailSchema,
    firstName: z
      .string()
      .trim()
      .min(1, 'Bitte gib deinen Vornamen ein.')
      .max(100, 'Der Vorname darf höchstens 100 Zeichen haben.'),
    lastName: z
      .string()
      .trim()
      .min(1, 'Bitte gib deinen Nachnamen ein.')
      .max(100, 'Der Nachname darf höchstens 100 Zeichen haben.'),
    password: authPasswordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Die Passwörter stimmen nicht überein.',
    path: ['passwordConfirmation'],
  })

export type LoginFormValues = z.infer<typeof loginFormSchema>
export type RegisterFormValues = z.infer<typeof registerFormSchema>

export function toLoginInput(values: LoginFormValues): LoginInput {
  return {
    email: values.email,
    password: values.password,
    rememberMe: values.rememberMe,
  }
}

export function toRegisterInput(values: RegisterFormValues): RegisterInput {
  return {
    email: values.email,
    firstName: values.firstName,
    lastName: values.lastName,
    password: values.password,
  }
}

export function applyLoginSubmissionError(
  error: unknown,
  setError: UseFormSetError<LoginFormValues>,
): FormErrorSummaryItem[] {
  return applySubmissionError<LoginFormValues>(error, setError, {
    fallbackMessage: 'Die Anmeldung ist fehlgeschlagen.',
    fieldAliases: {
      email: 'email',
      password: 'password',
      username: 'email',
    },
    statusMessages: {
      401: 'E-Mail-Adresse oder Passwort sind nicht korrekt.',
    },
  })
}

export function applyRegisterSubmissionError(
  error: unknown,
  setError: UseFormSetError<RegisterFormValues>,
): FormErrorSummaryItem[] {
  return applySubmissionError<RegisterFormValues>(error, setError, {
    fallbackMessage: 'Das Bürgerkonto konnte nicht erstellt werden.',
    fieldAliases: {
      email: 'email',
      first_name: 'firstName',
      firstName: 'firstName',
      last_name: 'lastName',
      lastName: 'lastName',
      password: 'password',
    },
    statusMessages: {
      409: 'Für diese E-Mail-Adresse besteht bereits ein Konto.',
    },
  })
}
