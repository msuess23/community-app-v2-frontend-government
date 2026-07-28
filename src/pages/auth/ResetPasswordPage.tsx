import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import {
  passwordRecoveryApi,
  type PasswordRecoveryApi,
} from '@/auth/auth-api'
import { useAuth } from '@/auth/auth-context'
import {
  applyResetPasswordError,
  resetPasswordFormSchema,
  toResetPasswordInput,
  type ResetPasswordFormValues,
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

export type ResetPasswordPageProps = Readonly<{
  api?: PasswordRecoveryApi
}>

export function ResetPasswordPage({
  api = passwordRecoveryApi,
}: ResetPasswordPageProps = {}) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const searchParams = new URLSearchParams(location.search)
  const defaultValues: ResetPasswordFormValues = {
    email: searchParams.get('email') ?? '',
    newPassword: '',
    otp: '',
    passwordConfirmation: '',
  }
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<ResetPasswordFormValues>({
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(resetPasswordFormSchema),
    shouldFocusError: true,
  })

  if (isAuthenticated) {
    return <Navigate replace to={isAuthorityUser(user) ? '/' : '/forbidden'} />
  }

  const formErrors = [
    ...submissionErrors,
    ...getFormErrorSummary(errors),
  ]

  return (
    <AuthPageLayout
      description="Gib den sechsstelligen Einmalcode und ein neues Passwort ein."
      footer={
        <p>
          Kein gültiger Code?{' '}
          <Link
            className="text-primary focus-visible:outline-primary rounded-sm font-semibold underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
            to="/password-forgotten"
          >
            Neuen Code anfordern
          </Link>
        </p>
      }
      title="Passwort zurücksetzen"
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setSubmissionErrors([])

          try {
            await api.resetPassword(toResetPasswordInput(values))
            navigate('/login?passwordReset=1', { replace: true })
          } catch (error) {
            setSubmissionErrors(applyResetPasswordError(error, setError))
          }
        })}
      >
        <FormErrorSummary errors={formErrors} />

        <ControlledTextField
          autoComplete="email"
          control={control}
          isRequired
          label="E-Mail-Adresse"
          name="email"
          type="email"
        />

        <ControlledTextField
          autoComplete="one-time-code"
          control={control}
          description="Der Code besteht aus genau sechs Ziffern."
          isRequired
          label="Einmalcode"
          maxLength={6}
          name="otp"
          type="text"
        />

        <ControlledTextField
          autoComplete="new-password"
          control={control}
          description="Mindestens acht Zeichen und höchstens 72 UTF-8-Byte."
          isRequired
          label="Neues Passwort"
          name="newPassword"
          type="password"
        />

        <ControlledTextField
          autoComplete="new-password"
          control={control}
          isRequired
          label="Neues Passwort bestätigen"
          name="passwordConfirmation"
          type="password"
        />

        <FormActions>
          <Button isDisabled={isSubmitting} type="submit">
            {isSubmitting ? 'Passwort wird geändert …' : 'Passwort ändern'}
          </Button>
        </FormActions>
      </form>
    </AuthPageLayout>
  )
}
