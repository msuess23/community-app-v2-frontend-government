import type {
  FieldPath,
  FieldValues,
  UseFormSetError,
} from 'react-hook-form'
import { z } from 'zod'

import { isApiError } from '@/api/client/api-error'
import type { LoginInput, RegisterInput } from '@/auth/auth-types'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Bitte gib deine E-Mail-Adresse ein.')
  .email('Bitte gib eine gültige E-Mail-Adresse ein.')

const passwordByteLengthSchema = z
  .string()
  .min(8, 'Das Passwort muss mindestens acht Zeichen haben.')
  .max(128, 'Das Passwort darf höchstens 128 Zeichen haben.')
  .refine(
    (password) => new TextEncoder().encode(password).length <= 72,
    'Das Passwort darf in UTF-8 höchstens 72 Byte lang sein.',
  )

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Bitte gib dein Passwort ein.'),
  rememberMe: z.boolean(),
})

export const registerFormSchema = z
  .object({
    email: emailSchema,
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
    password: passwordByteLengthSchema,
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

type SubmissionErrorOptions<TFieldValues extends FieldValues> = Readonly<{
  fallbackMessage: string
  fieldAliases: Readonly<Record<string, FieldPath<TFieldValues>>>
  statusMessages: Readonly<Record<number, string>>
}>

function applySubmissionError<TFieldValues extends FieldValues>(
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
    const field = detail.field
      ? options.fieldAliases[detail.field]
      : undefined

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
        options.statusMessages[error.status] ??
        (error.status === 0 ? error.message : options.fallbackMessage),
    },
  ]
}
