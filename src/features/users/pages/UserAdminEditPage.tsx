import { Save, ShieldAlert, Undo2, UserCog } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router'

import type { AuthUser } from '@/auth/auth-types'
import { useAuth } from '@/auth/auth-context'
import { getRoleLabel } from '@/auth/role-labels'
import { UserStatusBadge } from '@/features/users/components/UserStatusBadge'
import {
  applyUserAdminSubmissionError,
  createUserAdminFormSchema,
  getAssignableRoles,
  getOfficeAssignmentMode,
  hasUserAdminChanges,
  toUserAdminFormValues,
  type UserAdminFormValues,
} from '@/features/users/model/user-admin-form'
import {
  getUserDisplayName,
  type UserRecord,
} from '@/features/users/model/user-model'
import { useUpdateUserByAdminMutation } from '@/features/users/queries/user-admin-mutations'
import { createUserDetailQueryOptions } from '@/features/users/queries/user-queries'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { ControlledChangeReasonField } from '@/shared/forms/ControlledChangeReasonField'
import { ControlledSelectField } from '@/shared/forms/ControlledSelectField'
import { ControlledTextField } from '@/shared/forms/ControlledTextField'
import { FormFieldScope } from '@/shared/forms/FormFieldScope'
import { useUnsavedChangesGuard } from '@/shared/forms/use-unsaved-changes-guard'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import { ControlledOfficeSelectionField } from '@/shared/offices/ControlledOfficeSelectionField'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import { resolveResourceDetailReturnTo } from '@/shared/resource-detail/detail-navigation'
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

/** Provides the administrator-only workflow for role, office, and profile changes. */
export function UserAdminEditPage() {
  const { user: currentUser } = useAuth()
  const { userId = '' } = useParams()
  const query = useQuery({
    ...createUserDetailQueryOptions(userId),
    enabled: userId.length > 0,
  })

  if (!currentUser) {
    return null
  }

  return (
    <RemoteDataBoundary
      errorOptions={{
        fallback: {
          description:
            'Das Benutzerkonto konnte nicht für die Bearbeitung geladen werden.',
          title: 'Bearbeitung nicht verfügbar',
        },
      }}
      loadingLabel="Benutzerkonto wird für die Bearbeitung geladen."
      query={query}
    >
      {(targetUser) => (
        <UserAdminEditForm currentUser={currentUser} targetUser={targetUser} />
      )}
    </RemoteDataBoundary>
  )
}

interface UserAdminEditFormProps {
  currentUser: AuthUser
  targetUser: UserRecord
}

/** Owns one edit session and keeps role-dependent office values consistent. */
function UserAdminEditForm({
  currentUser,
  targetUser,
}: UserAdminEditFormProps) {
  const { notify } = useFeedback()
  const location = useLocation()
  const navigate = useNavigate()
  const mutation = useUpdateUserByAdminMutation()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const schema = useMemo(
    () => createUserAdminFormSchema(targetUser, currentUser),
    [currentUser, targetUser],
  )
  const initialValues = useMemo(
    () => toUserAdminFormValues(targetUser),
    [targetUser],
  )
  const {
    control,
    formState: { errors, isDirty, isSubmitting, submitCount },
    handleSubmit,
    reset,
    setError,
    setValue,
  } = useForm<UserAdminFormValues>({
    defaultValues: initialValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(schema),
    shouldFocusError: false,
  })
  const selectedFirstName = useWatch({ control, name: 'firstName' })
  const selectedLastName = useWatch({ control, name: 'lastName' })
  const selectedRole = useWatch({ control, name: 'role' })
  const selectedOfficeId = useWatch({ control, name: 'officeId' })
  const officeMode = getOfficeAssignmentMode(selectedRole)
  const hasAccountChanges = hasUserAdminChanges(
    {
      changeReason: '',
      firstName: selectedFirstName,
      lastName: selectedLastName,
      officeId: selectedOfficeId,
      role: selectedRole,
    },
    targetUser,
  )
  const assignableRoles = getAssignableRoles(targetUser, currentUser)
  const detailPath = `/users/${targetUser.id}`
  const listReturnTo = resolveListReturnTo(location.state)
  const { confirmDiscardChanges } = useUnsavedChangesGuard({
    hasUnsavedChanges: isDirty,
  })

  useEffect(() => {
    if (officeMode === 'forbidden' && selectedOfficeId) {
      // Citizen and admin accounts cannot retain an office in the backend model.
      setValue('officeId', '', { shouldDirty: true, shouldValidate: true })
    }
  }, [officeMode, selectedOfficeId, setValue])

  const formErrors = [...submissionErrors, ...getFormErrorSummary(errors)]

  /** Returns to the user detail page while preserving its original directory state. */
  async function returnToDetail(): Promise<void> {
    const accepted = await confirmDiscardChanges()

    if (!accepted) {
      return
    }

    navigate(detailPath, {
      state: { from: listReturnTo },
    })
  }

  if (!targetUser.isActive) {
    return (
      <div className="space-y-6">
        <PageHeader
          description="Deaktivierte Konten können nicht mehr administrativ bearbeitet werden."
          eyebrow="Benutzerverwaltung"
          title={getUserDisplayName(targetUser)}
        />
        <Card variant="subtle">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="bg-error-container text-on-error-container flex size-12 shrink-0 items-center justify-center rounded-full">
              <ShieldAlert aria-hidden="true" size={24} />
            </span>
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Bearbeitung nicht möglich</h2>
              <p className="text-on-surface-variant leading-7">
                Das Konto ist deaktiviert. Eine Reaktivierung wird vom Backend
                derzeit nicht unterstützt.
              </p>
              <Button
                onPress={() =>
                  navigate(detailPath, { state: { from: listReturnTo } })
                }
                variant="outline"
              >
                Zum Benutzerprofil
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={<UserStatusBadge isActive={targetUser.isActive} />}
        description="Passe Namen, Rolle und organisatorische Zuordnung an. Jede Änderung benötigt eine nachvollziehbare Begründung."
        eyebrow="Benutzerverwaltung"
        title={getUserDisplayName(targetUser)}
      />

      <form
        className="space-y-6"
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setSubmissionErrors([])

          try {
            const updatedUser = await mutation.mutateAsync({
              userId: targetUser.id,
              values,
            })
            reset(toUserAdminFormValues(updatedUser))
            notify({
              dedupeKey: `user-admin-update:${updatedUser.id}`,
              description:
                'Rolle, Behördenzuordnung und Profildaten entsprechen jetzt dem bestätigten Serverstand.',
              title: 'Benutzerkonto gespeichert',
              tone: 'success',
            })
            navigate(detailPath, {
              replace: true,
              state: { from: listReturnTo },
            })
          } catch (error) {
            setSubmissionErrors(applyUserAdminSubmissionError(error, setError))
          }
        })}
      >
        <FormFieldScope>
          <FormErrorSummary
            errors={formErrors}
            focusKey={submitCount}
            shouldFocus
          />

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
            <Card>
              <FormSection
                description="Vor- und Nachname werden in Arbeitslisten, Zuständigkeiten und Auditansichten verwendet."
                requiredFieldsHint
                title="Profildaten"
              >
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
              </FormSection>
            </Card>

            <Card variant="subtle">
              <section
                aria-labelledby="immutable-account-heading"
                className="space-y-4"
              >
                <div className="flex items-start gap-3">
                  <span className="bg-primary-container text-on-primary-container flex size-11 shrink-0 items-center justify-center rounded-full">
                    <UserCog aria-hidden="true" size={22} />
                  </span>
                  <div>
                    <h2
                      className="text-xl font-semibold"
                      id="immutable-account-heading"
                    >
                      Kontoreferenz
                    </h2>
                    <p className="text-on-surface-variant mt-1 text-sm leading-6">
                      Diese Angaben können in diesem Workflow nicht geändert
                      werden.
                    </p>
                  </div>
                </div>
                <dl className="divide-outline-variant divide-y text-sm">
                  <MetadataRow label="E-Mail-Adresse" value={targetUser.email} />
                </dl>
              </section>
            </Card>
          </div>

          <Card>
            <FormSection
              description="Die Rolle steuert den Zugang zu Fachbereichen. Die Behörde grenzt Zuständigkeiten und sichtbare Daten ein."
              requiredFieldsHint
              title="Rolle und Behörde"
            >
              <div className="grid items-start gap-6 lg:grid-cols-2">
                <ControlledSelectField
                  control={control}
                  description={
                    targetUser.id === currentUser.id
                      ? 'Die eigene Adminrolle kann aus Sicherheitsgründen nicht entfernt werden.'
                      : targetUser.role === 'CITIZEN'
                        ? 'Ein Bürgerkonto kann einmalig für eine Behördenrolle freigeschaltet werden.'
                        : 'Ein bestehendes Behördenkonto kann nicht wieder zum Bürgerkonto werden.'
                  }
                  label="Rolle"
                  required
                  name="role"
                  options={assignableRoles.map((role) => ({
                    label: getRoleLabel(role),
                    value: role,
                  }))}
                />

                {officeMode === 'forbidden' ? (
                  <div
                    className="border-outline-variant bg-surface-container rounded-xl border p-5"
                    role="status"
                  >
                    <h3 className="font-semibold">Keine Behördenzuordnung</h3>
                    <p className="text-on-surface-variant mt-2 text-sm leading-6">
                      {selectedRole === 'CITIZEN'
                        ? 'Bürgerkonten gehören keiner Behörde an.'
                        : 'Administrationskonten werden behördenübergreifend geführt.'}
                    </p>
                  </div>
                ) : (
                  <ControlledOfficeSelectionField
                    control={control}
                    currentOfficeId={targetUser.officeId}
                    description={
                      officeMode === 'required'
                        ? 'Sachbearbeitung und Leitung benötigen eine aktive Behörde.'
                        : 'Für die Disposition ist eine Behördenzuordnung optional.'
                    }
                    isRequired={officeMode === 'required'}
                    name="officeId"
                  />
                )}
              </div>
            </FormSection>
          </Card>

          <Card>
            <FormSection
              description="Der Änderungsgrund wird dauerhaft in der Benutzerhistorie gespeichert."
              requiredFieldsHint
              title="Nachvollziehbarkeit"
            >
              <ControlledChangeReasonField
                control={control}
                name="changeReason"
              />
            </FormSection>
          </Card>

          <FormActions>
            <Button
              isDisabled={isSubmitting || mutation.isPending}
              onPress={() => void returnToDetail()}
              type="button"
              variant="outline"
            >
              Zurück zum Profil
            </Button>
            <Button
              isDisabled={!isDirty || isSubmitting || mutation.isPending}
              onPress={() => {
                reset(initialValues)
                setSubmissionErrors([])
              }}
              type="button"
              variant="outline"
            >
              <Undo2 aria-hidden="true" size={18} />
              Änderungen verwerfen
            </Button>
            <FormSubmitButton
              isDisabled={!hasAccountChanges || mutation.isPending}
              isSubmitting={isSubmitting || mutation.isPending}
              pendingLabel="Benutzerkonto wird gespeichert …"
            >
              <Save aria-hidden="true" size={18} />
              Änderungen speichern
            </FormSubmitButton>
          </FormActions>
        </FormFieldScope>
      </form>
    </div>
  )
}

interface MetadataRowProps {
  label: string
  value: string
}

/** Renders one immutable account attribute in the edit-page summary card. */
function MetadataRow({ label, value }: MetadataRowProps) {
  return (
    <div className="grid gap-1 py-3 first:pt-0 last:pb-0">
      <dt className="text-on-surface-variant font-medium">{label}</dt>
      <dd className="font-semibold break-all">{value}</dd>
    </div>
  )
}

/** Reads the directory return target forwarded through the detail page. */
function resolveListReturnTo(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('listFrom' in state)) {
    return '/users'
  }

  const listFrom = (state as { listFrom?: unknown }).listFrom
  return resolveResourceDetailReturnTo({ from: listFrom }, '/users')
}
