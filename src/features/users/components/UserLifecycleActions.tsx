import { ShieldX } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  applyUserDeactivationError,
  getUserDeactivationConsequences,
  userDeactivationSchema,
  type UserDeactivationFormValues,
} from '@/features/users/model/user-deactivation'
import type { UserRecord } from '@/features/users/model/user-model'
import { useDeactivateUserMutation } from '@/features/users/queries/user-deactivation-mutation'
import { useConfirmation } from '@/shared/confirmation/confirmation-context'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { ControlledChangeReasonField } from '@/shared/forms/ControlledChangeReasonField'
import { FormFieldScope } from '@/shared/forms/FormFieldScope'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import {
  useResourceActionCloseGuard,
  useResourceActionDialog,
} from '@/shared/resource-detail/resource-action-dialog-context'
import { ResourceActionBar } from '@/shared/resource-detail/ResourceActionBar'
import { createResourceActionRegistry } from '@/shared/resource-detail/resource-action-registry'
import { FormActions } from '@/shared/ui/FormActions'
import {
  FormErrorSummary,
  type FormErrorSummaryItem,
} from '@/shared/ui/FormErrorSummary'
import { FormSubmitButton } from '@/shared/ui/FormSubmitButton'

const USER_LIFECYCLE_ACTION = 'deactivate' as const

type UserLifecycleAction = typeof USER_LIFECYCLE_ACTION

/** Exposes destructive user lifecycle actions without mixing them into edit forms. */
export function UserLifecycleActions({ user }: Readonly<{ user: UserRecord }>) {
  const registry = useMemo(
    () =>
      createResourceActionRegistry<UserLifecycleAction>([
        {
          action: USER_LIFECYCLE_ACTION,
          buttonVariant: 'danger',
          description:
            'Die Deaktivierung beendet den Zugang dauerhaft und wird in der Änderungshistorie dokumentiert.',
          dialogTitle: 'Benutzerkonto deaktivieren',
          icon: <ShieldX aria-hidden="true" size={18} />,
          label: 'Benutzer deaktivieren',
          render: () => <UserDeactivationForm user={user} />,
        },
      ]),
    [user],
  )

  return (
    <ResourceActionBar
      allowedActions={[USER_LIFECYCLE_ACTION]}
      ariaLabel="Lebenszyklusaktionen für das Benutzerkonto"
      registry={registry}
    />
  )
}

/** Collects the mandatory audit reason and executes one irreversible deactivation. */
function UserDeactivationForm({ user }: Readonly<{ user: UserRecord }>) {
  const { confirm } = useConfirmation()
  const { notify } = useFeedback()
  const { close } = useResourceActionDialog()
  const mutation = useDeactivateUserMutation()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const {
    control,
    formState: { errors, isDirty, isSubmitting, submitCount },
    handleSubmit,
    reset,
  } = useForm<UserDeactivationFormValues>({
    defaultValues: { changeReason: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(userDeactivationSchema),
    shouldFocusError: false,
  })
  const requestClose = useCallback(async () => {
    if (!isDirty) {
      return true
    }

    return confirm({
      confirmLabel: 'Eingaben verwerfen',
      description:
        'Der eingetragene Änderungsgrund geht verloren, wenn du den Dialog schließt.',
      title: 'Deaktivierung abbrechen?',
      tone: 'danger',
    })
  }, [confirm, isDirty])
  useResourceActionCloseGuard(requestClose)
  const formErrors = [...submissionErrors, ...getFormErrorSummary(errors)]

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setSubmissionErrors([])

        try {
          const deactivatedUser = await mutation.mutateAsync({
            userId: user.id,
            values,
          })
          reset({ changeReason: '' })
          notify({
            autoDismissAfter: null,
            dedupeKey: `user-deactivated:${user.id}`,
            description:
              deactivatedUser.role === 'CITIZEN'
                ? 'Das Bürgerkonto wurde deaktiviert und unmittelbar anonymisiert.'
                : 'Das Behördenkonto wurde deaktiviert und alle Sitzungen wurden beendet.',
            title: 'Benutzerkonto deaktiviert',
            tone: 'success',
          })
          close()
        } catch (error) {
          setSubmissionErrors(applyUserDeactivationError(error))
        }
      })}
    >
      <FormFieldScope>
        <FormErrorSummary
          errors={formErrors}
          focusKey={submitCount}
          shouldFocus
        />

        <section aria-labelledby="deactivation-consequences-heading">
          <h3
            className="text-lg font-semibold"
            id="deactivation-consequences-heading"
          >
            Folgen der Deaktivierung
          </h3>
          <ul className="text-on-surface-variant mt-3 list-disc space-y-2 pl-5 leading-7">
            {getUserDeactivationConsequences(user).map((consequence) => (
              <li key={consequence}>{consequence}</li>
            ))}
          </ul>
        </section>

        <ControlledChangeReasonField
          control={control}
          description="Die Begründung wird zusammen mit dem finalen Kontostand dauerhaft gespeichert."
          name="changeReason"
        />

        <FormActions>
          <FormSubmitButton
            isSubmitting={isSubmitting}
            pendingLabel="Konto wird deaktiviert …"
            variant="danger"
          >
            Benutzer endgültig deaktivieren
          </FormSubmitButton>
        </FormActions>
      </FormFieldScope>
    </form>
  )
}
