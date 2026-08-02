import { LogOut, MonitorOff, Save, ShieldCheck, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'

import {
  accountProfileFormSchema,
  applyAccountProfileSubmissionError,
  toAccountProfileFormValues,
  toUpdateCurrentUserInput,
  type AccountProfileFormValues,
} from '@/auth/account-form'
import { useAuth } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { getRoleLabel } from '@/auth/role-labels'
import { useConfirmation } from '@/shared/confirmation/confirmation-context'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { FormFieldScope } from '@/shared/forms/FormFieldScope'
import { ControlledTextField } from '@/shared/forms/ControlledTextField'
import { useUnsavedChangesGuard } from '@/shared/forms/use-unsaved-changes-guard'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { FormActions } from '@/shared/ui/FormActions'
import {
  FormErrorSummary,
  type FormErrorSummaryItem,
} from '@/shared/ui/FormErrorSummary'
import { FormSection } from '@/shared/ui/FormSection'
import { FormSubmitButton } from '@/shared/ui/FormSubmitButton'
import { PageHeader } from '@/shared/ui/PageHeader'

/** Routes authenticated users to the account management content for their profile. */
export function AccountPage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return <AuthenticatedAccountPage user={user} />
}

type AuthenticatedAccountPageProps = Readonly<{
  user: AuthUser
}>

type SessionAction = 'all' | 'current' | null

/** Provides self-service profile editing and local or global sign-out actions. */
function AuthenticatedAccountPage({ user }: AuthenticatedAccountPageProps) {
  const { logout, logoutAll, updateCurrentUser } = useAuth()
  const { confirm } = useConfirmation()
  const { notify } = useFeedback()
  const navigate = useNavigate()
  const [sessionAction, setSessionAction] = useState<SessionAction>(null)
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const {
    control,
    formState: { errors, isDirty, isSubmitting, submitCount },
    handleSubmit,
    reset,
    setError,
  } = useForm<AccountProfileFormValues>({
    defaultValues: toAccountProfileFormValues(user),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(accountProfileFormSchema),
    shouldFocusError: false,
  })

  useEffect(() => {
    // External profile refreshes may update metadata, but must not overwrite local edits.
    if (!isDirty) {
      reset(toAccountProfileFormValues(user))
    }
  }, [isDirty, reset, user])

  const { confirmDiscardChanges } = useUnsavedChangesGuard({
    hasUnsavedChanges: isDirty,
  })

  const formErrors = [...submissionErrors, ...getFormErrorSummary(errors)]
  const isSessionActionPending = sessionAction !== null

  /** Ends only the browser session represented by this tab or remembered login. */
  async function handleCurrentSessionLogout(): Promise<void> {
    const accepted = await confirmDiscardChanges({
      confirmLabel: 'Abmelden und verwerfen',
      description:
        'Deine geänderten Profildaten wurden noch nicht gespeichert. Bei der Abmeldung gehen sie verloren.',
      title: 'Trotz ungespeicherter Änderungen abmelden?',
    })

    if (!accepted) {
      return
    }

    reset(toAccountProfileFormValues(user))
    setSessionAction('current')

    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  /** Revokes every refresh session after an explicit destructive confirmation. */
  async function handleAllSessionsLogout(): Promise<void> {
    const accepted = await confirm({
      confirmLabel: 'Alle Sitzungen beenden',
      description:
        'Du wirst auf diesem Gerät und auf allen weiteren angemeldeten Geräten abgemeldet. Nicht gespeicherte Eingaben in anderen Sitzungen gehen verloren.',
      title: 'Alle Sitzungen wirklich beenden?',
      tone: 'danger',
    })

    if (!accepted) {
      return
    }

    reset(toAccountProfileFormValues(user))
    setSessionAction('all')

    try {
      await logoutAll()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description="Verwalte deine eigenen Profildaten und die aktiven Anmeldungen dieses Kontos."
        eyebrow="Konto"
        title="Mein Konto"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card>
          <FormSection
            description={
              <p>
                Diese Namen werden in der Behördenanwendung zur Zuordnung deiner
                Aktionen angezeigt.
              </p>
            }
            headingId="profile-heading"
            requiredFieldsHint
            title="Persönliche Angaben"
          >
            <form
              className="space-y-5"
              noValidate
              onSubmit={handleSubmit(async (values) => {
                setSubmissionErrors([])

                try {
                  const updatedUser = await updateCurrentUser(
                    toUpdateCurrentUserInput(values),
                  )
                  reset(toAccountProfileFormValues(updatedUser))
                  notify({
                    dedupeKey: 'account-profile-updated',
                    description:
                      'Die geänderten Namen werden ab sofort in der Anwendung verwendet.',
                    title: 'Profildaten gespeichert',
                    tone: 'success',
                  })
                } catch (error) {
                  setSubmissionErrors(
                    applyAccountProfileSubmissionError(error, setError),
                  )
                }
              })}
            >
              <FormFieldScope>
                <FormErrorSummary
                  errors={formErrors}
                  focusKey={submitCount}
                  shouldFocus
                />

                <div className="grid gap-5 md:grid-cols-2">
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

                <FormActions>
                  <Button
                    isDisabled={!isDirty || isSubmitting}
                    onPress={() => {
                      reset(toAccountProfileFormValues(user))
                      setSubmissionErrors([])
                    }}
                    type="button"
                    variant="outline"
                  >
                    <Undo2 aria-hidden="true" size={18} />
                    Änderungen verwerfen
                  </Button>
                  <FormSubmitButton
                    isDisabled={!isDirty}
                    isSubmitting={isSubmitting}
                    pendingLabel="Speichern läuft …"
                  >
                    <Save aria-hidden="true" size={18} />
                    Änderungen speichern
                  </FormSubmitButton>
                </FormActions>
              </FormFieldScope>
            </form>
          </FormSection>
        </Card>

        <Card variant="subtle">
          <section aria-labelledby="account-data-heading" className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="bg-primary-container text-on-primary-container flex size-11 shrink-0 items-center justify-center rounded-full">
                <ShieldCheck aria-hidden="true" size={22} />
              </span>
              <div>
                <h2
                  className="text-xl font-semibold tracking-tight"
                  id="account-data-heading"
                >
                  Kontodaten
                </h2>
                <p className="text-on-surface-variant mt-1 text-sm leading-6">
                  Diese Angaben werden durch die Administration verwaltet.
                </p>
              </div>
            </div>

            <dl className="divide-outline-variant divide-y text-sm">
              <AccountMetadata label="E-Mail-Adresse" value={user.email} />
              <AccountMetadata label="Rolle" value={getRoleLabel(user.role)} />
              <AccountMetadata
                label="Zugeordnete Behörde"
                value={user.officeId ?? 'Keine Behörde zugeordnet'}
              />
            </dl>
          </section>
        </Card>
      </div>

      <Card>
        <section aria-labelledby="sessions-heading" className="space-y-6">
          <div className="space-y-2">
            <h2
              className="text-2xl font-semibold tracking-tight"
              id="sessions-heading"
            >
              Sitzungen
            </h2>
            <p className="text-on-surface-variant max-w-3xl leading-7">
              Beende nur diese Anmeldung oder widerrufe alle Refresh-Sitzungen,
              wenn ein Gerät nicht mehr vertrauenswürdig ist.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="border-outline-variant rounded-xl border p-5">
              <h3 className="font-semibold">Diese Sitzung</h3>
              <p className="text-on-surface-variant mt-2 text-sm leading-6">
                Meldet nur den aktuell verwendeten Browser ab. Andere Geräte
                bleiben angemeldet.
              </p>
              <Button
                className="mt-5 w-full sm:w-auto"
                isDisabled={isSessionActionPending}
                onPress={() => void handleCurrentSessionLogout()}
                variant="outline"
              >
                <LogOut aria-hidden="true" size={18} />
                {sessionAction === 'current'
                  ? 'Abmeldung läuft …'
                  : 'Diese Sitzung abmelden'}
              </Button>
            </div>

            <div className="border-error/50 bg-error-container/30 rounded-xl border p-5">
              <h3 className="font-semibold">Alle Sitzungen</h3>
              <p className="text-on-surface-variant mt-2 text-sm leading-6">
                Widerruft die Anmeldungen auf allen Geräten. Verwende diese
                Aktion bei Verlust oder Verdacht auf unbefugten Zugriff.
              </p>
              <Button
                className="mt-5 w-full sm:w-auto"
                isDisabled={isSessionActionPending}
                onPress={() => void handleAllSessionsLogout()}
                variant="danger"
              >
                <MonitorOff aria-hidden="true" size={18} />
                {sessionAction === 'all'
                  ? 'Sitzungen werden beendet …'
                  : 'Alle Sitzungen beenden'}
              </Button>
            </div>
          </div>
        </section>
      </Card>
    </div>
  )
}

type AccountMetadataProps = Readonly<{
  label: string
  value: string
}>

/** Renders one immutable account attribute with responsive wrapping. */
function AccountMetadata({ label, value }: AccountMetadataProps) {
  return (
    <div className="grid gap-1 py-3 first:pt-0 last:pb-0">
      <dt className="text-on-surface-variant font-medium">{label}</dt>
      <dd className="font-semibold break-words">{value}</dd>
    </div>
  )
}
