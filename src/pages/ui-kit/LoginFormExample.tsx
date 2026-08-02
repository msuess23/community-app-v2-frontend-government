import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { FormFieldScope } from '@/shared/forms/FormFieldScope'
import { ControlledCheckboxField } from '@/shared/forms/ControlledCheckboxField'
import { ControlledTextField } from '@/shared/forms/ControlledTextField'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import { Button } from '@/shared/ui/Button'
import { FormActions } from '@/shared/ui/FormActions'
import { FormErrorSummary } from '@/shared/ui/FormErrorSummary'

const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Bitte gib deine E-Mail-Adresse ein.')
    .email('Bitte gib eine gültige E-Mail-Adresse ein.'),
  password: z
    .string()
    .min(8, 'Das Passwort muss mindestens acht Zeichen haben.'),
  rememberMe: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

const defaultValues: LoginFormValues = {
  email: '',
  password: '',
  rememberMe: false,
}

export function LoginFormExample() {
  const [submittedEmail, setSubmittedEmail] = useState<string>()
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<LoginFormValues>({
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(loginFormSchema),
    shouldFocusError: true,
  })

  const errorSummary = getFormErrorSummary(errors)

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setSubmittedEmail(values.email)
      })}
    >
      <FormFieldScope>
        <FormErrorSummary errors={errorSummary} />

        <ControlledTextField
          autoComplete="email"
          control={control}
          description="Verwende die dienstliche E-Mail-Adresse."
          isRequired
          label="E-Mail-Adresse"
          name="email"
          placeholder="name@behoerde.de"
          type="email"
        />

        <ControlledTextField
          autoComplete="current-password"
          control={control}
          description="Mindestens acht Zeichen."
          isRequired
          label="Passwort"
          name="password"
          type="password"
        />

        <ControlledCheckboxField
          control={control}
          description="Nur auf einem privaten oder dienstlich verwalteten Gerät aktivieren."
          label="Angemeldet bleiben"
          name="rememberMe"
        />

        {submittedEmail ? (
          <p
            className="bg-tertiary-container text-on-tertiary-container rounded-lg p-3 text-sm font-medium"
            role="status"
          >
            Das Beispielformular wurde für {submittedEmail} validiert.
          </p>
        ) : null}

        <FormActions>
          <Button isDisabled={isSubmitting} type="submit">
            Beispiel validieren
          </Button>
        </FormActions>
      </FormFieldScope>
    </form>
  )
}
