import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router'

import { useAuth } from '@/auth/auth-context'
import {
  applyLoginSubmissionError,
  loginFormSchema,
  toLoginInput,
  type LoginFormValues,
} from '@/auth/auth-form'
import { getSafeReturnTo } from '@/auth/auth-redirect'
import { isAuthorityUser } from '@/auth/permissions'
import { AuthPageLayout } from '@/pages/auth/AuthPageLayout'
import { ControlledCheckboxField } from '@/shared/forms/ControlledCheckboxField'
import { ControlledTextField } from '@/shared/forms/ControlledTextField'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import { FormActions } from '@/shared/ui/FormActions'
import { FormSubmitButton } from '@/shared/ui/FormSubmitButton'
import {
  FormErrorSummary,
  type FormErrorSummaryItem,
} from '@/shared/ui/FormErrorSummary'

const defaultValues: LoginFormValues = {
  email: '',
  password: '',
  rememberMe: false,
}

/** Authenticates registered accounts and routes them to the permitted application area. */
export function LoginPage() {
  const { isAuthenticated, login, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const searchParams = new URLSearchParams(location.search)
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'))
  const registrationCompleted = searchParams.get('registered') === '1'
  const passwordResetCompleted = searchParams.get('passwordReset') === '1'
  const successMessage = registrationCompleted
    ? 'Das Bürgerkonto wurde erstellt. Nach der Freischaltung durch die Administration kannst du den Behördenclient nutzen.'
    : passwordResetCompleted
      ? 'Das Passwort wurde geändert. Du kannst dich jetzt anmelden.'
      : undefined
  const {
    control,
    formState: { errors, isSubmitting, submitCount },
    handleSubmit,
    setError,
  } = useForm<LoginFormValues>({
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(loginFormSchema),
    shouldFocusError: false,
  })

  if (isAuthenticated) {
    return (
      <Navigate
        replace
        to={isAuthorityUser(user) ? returnTo : '/access-pending'}
      />
    )
  }

  const formErrors = [
    ...submissionErrors,
    ...getFormErrorSummary(errors),
  ]

  return (
    <AuthPageLayout
      description="Melde dich mit deinem registrierten Konto an."
      footer={
        <p>
          Noch kein Bürgerkonto?{' '}
          <Link
            className="text-primary focus-visible:outline-primary rounded-sm font-semibold underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
            to="/register"
          >
            Konto erstellen
          </Link>
        </p>
      }
      title="Anmelden"
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setSubmissionErrors([])

          try {
            const authenticatedUser = await login(toLoginInput(values))

            navigate(
              isAuthorityUser(authenticatedUser) ? returnTo : '/access-pending',
              { replace: true },
            )
          } catch (error) {
            setSubmissionErrors(applyLoginSubmissionError(error, setError))
          }
        })}
      >
        {successMessage ? (
          <p
            className="bg-tertiary-container text-on-tertiary-container rounded-lg p-4 text-sm font-medium"
            role="status"
          >
            {successMessage}
          </p>
        ) : null}

        <FormErrorSummary
          errors={formErrors}
          focusKey={submitCount}
          shouldFocus
        />

        <ControlledTextField
          autoComplete="email"
          control={control}
          isRequired
          label="E-Mail-Adresse"
          name="email"
          placeholder="name@behoerde.de"
          type="email"
        />

        <ControlledTextField
          autoComplete="current-password"
          control={control}
          isRequired
          label="Passwort"
          name="password"
          type="password"
        />

        <p className="text-right text-sm">
          <Link
            className="text-primary focus-visible:outline-primary rounded-sm font-semibold underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
            to="/password-forgotten"
          >
            Passwort vergessen?
          </Link>
        </p>

        <ControlledCheckboxField
          control={control}
          description="Nur auf einem privaten oder dienstlich verwalteten Gerät aktivieren."
          label="Angemeldet bleiben"
          name="rememberMe"
        />

        <FormActions>
          <FormSubmitButton
            isSubmitting={isSubmitting}
            pendingLabel="Anmeldung läuft …"
          >
            Anmelden
          </FormSubmitButton>
        </FormActions>
      </form>
    </AuthPageLayout>
  )
}
