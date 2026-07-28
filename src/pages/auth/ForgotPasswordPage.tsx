import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router'

import {
  passwordRecoveryApi,
  type PasswordRecoveryApi,
} from '@/auth/auth-api'
import { useAuth } from '@/auth/auth-context'
import {
  applyRequestPasswordResetError,
  requestPasswordResetFormSchema,
  toRequestPasswordResetInput,
  type RequestPasswordResetFormValues,
} from '@/auth/password-recovery-form'
import { isAuthorityUser } from '@/auth/permissions'
import { AuthPageLayout } from '@/pages/auth/AuthPageLayout'
import { ControlledTextField } from '@/shared/forms/ControlledTextField'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import { Button } from '@/shared/ui/Button'
import { FormActions } from '@/shared/ui/FormActions'
import {
  FormErrorSummary,
  type FormErrorSummaryItem,
} from '@/shared/ui/FormErrorSummary'
import { LinkButton } from '@/shared/ui/LinkButton'

const defaultValues: RequestPasswordResetFormValues = { email: '' }

export type ForgotPasswordPageProps = Readonly<{
  api?: PasswordRecoveryApi
}>

export function ForgotPasswordPage({
  api = passwordRecoveryApi,
}: ForgotPasswordPageProps = {}) {
  const { isAuthenticated, user } = useAuth()
  const [requestedEmail, setRequestedEmail] = useState<string>()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<RequestPasswordResetFormValues>({
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(requestPasswordResetFormSchema),
    shouldFocusError: true,
  })

  if (isAuthenticated) {
    return <Navigate replace to={isAuthorityUser(user) ? '/' : '/forbidden'} />
  }

  const footer = (
    <p>
      Zurück zur{' '}
      <Link
        className="text-primary focus-visible:outline-primary rounded-sm font-semibold underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
        to="/login"
      >
        Anmeldung
      </Link>
    </p>
  )

  if (requestedEmail) {
    return (
      <AuthPageLayout
        description="Die Anfrage wurde verarbeitet."
        footer={footer}
        title="Einmalcode angefordert"
      >
        <div className="space-y-5">
          <p
            className="bg-tertiary-container text-on-tertiary-container rounded-lg p-4 text-sm font-medium leading-6"
            role="status"
          >
            Wenn für diese E-Mail-Adresse ein aktives Konto besteht, wurde ein
            Einmalcode versendet.
          </p>
          <p className="text-on-surface-variant text-sm leading-6">
            Der Hinweis ist absichtlich unabhängig davon, ob ein Konto gefunden
            wurde.
          </p>
          <FormActions>
            <LinkButton
              to={`/password-reset?email=${encodeURIComponent(requestedEmail)}`}
            >
              Einmalcode eingeben
            </LinkButton>
          </FormActions>
        </div>
      </AuthPageLayout>
    )
  }

  const formErrors = [
    ...submissionErrors,
    ...getFormErrorSummary(errors),
  ]

  return (
    <AuthPageLayout
      description="Fordere einen Einmalcode an, um dein Passwort zurückzusetzen."
      footer={footer}
      title="Passwort vergessen"
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setSubmissionErrors([])
          const input = toRequestPasswordResetInput(values)

          try {
            await api.requestPasswordReset(input)
            setRequestedEmail(input.email)
          } catch (error) {
            setSubmissionErrors(
              applyRequestPasswordResetError(error, setError),
            )
          }
        })}
      >
        <FormErrorSummary errors={formErrors} />

        <ControlledTextField
          autoComplete="email"
          control={control}
          description="Verwende die E-Mail-Adresse des Kontos."
          isRequired
          label="E-Mail-Adresse"
          name="email"
          placeholder="name@behoerde.de"
          type="email"
        />

        <FormActions>
          <Button isDisabled={isSubmitting} type="submit">
            {isSubmitting ? 'Anfrage wird gesendet …' : 'Einmalcode anfordern'}
          </Button>
        </FormActions>
      </form>
    </AuthPageLayout>
  )
}
