import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router'

import { useAuth } from '@/auth/auth-context'
import {
  applyRegisterSubmissionError,
  registerFormSchema,
  toRegisterInput,
  type RegisterFormValues,
} from '@/auth/auth-form'
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

const defaultValues: RegisterFormValues = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  passwordConfirmation: '',
}

/** Creates the citizen account that an administrator can promote to an authority role. */
export function RegisterPage() {
  const { isAuthenticated, register, user } = useAuth()
  const navigate = useNavigate()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<RegisterFormValues>({
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(registerFormSchema),
    shouldFocusError: true,
  })

  if (isAuthenticated) {
    return (
      <Navigate replace to={isAuthorityUser(user) ? '/' : '/access-pending'} />
    )
  }

  const formErrors = [
    ...submissionErrors,
    ...getFormErrorSummary(errors),
  ]

  return (
    <AuthPageLayout
      description="Die öffentliche Registrierung erstellt ein Bürgerkonto. Eine Behördenrolle kann ausschließlich durch die Administration vergeben werden."
      footer={
        <p>
          Du besitzt bereits ein Konto?{' '}
          <Link
            className="text-primary focus-visible:outline-primary rounded-sm font-semibold underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
            to="/login"
          >
            Zur Anmeldung
          </Link>
        </p>
      }
      title="Bürgerkonto erstellen"
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setSubmissionErrors([])

          try {
            await register(toRegisterInput(values))
            navigate('/login?registered=1', { replace: true })
          } catch (error) {
            setSubmissionErrors(applyRegisterSubmissionError(error, setError))
          }
        })}
      >
        <FormErrorSummary errors={formErrors} />

        <div className="grid gap-5 sm:grid-cols-2">
          <ControlledTextField
            autoComplete="given-name"
            control={control}
            isRequired
            label="Vorname"
            name="firstName"
          />
          <ControlledTextField
            autoComplete="family-name"
            control={control}
            isRequired
            label="Nachname"
            name="lastName"
          />
        </div>

        <ControlledTextField
          autoComplete="email"
          control={control}
          isRequired
          label="E-Mail-Adresse"
          name="email"
          type="email"
        />

        <ControlledTextField
          autoComplete="new-password"
          control={control}
          description="Mindestens acht Zeichen und höchstens 72 UTF-8-Byte."
          isRequired
          label="Passwort"
          name="password"
          type="password"
        />

        <ControlledTextField
          autoComplete="new-password"
          control={control}
          isRequired
          label="Passwort bestätigen"
          name="passwordConfirmation"
          type="password"
        />

        <FormActions>
          <Button isDisabled={isSubmitting} type="submit">
            {isSubmitting ? 'Konto wird erstellt …' : 'Konto erstellen'}
          </Button>
        </FormActions>
      </form>
    </AuthPageLayout>
  )
}
