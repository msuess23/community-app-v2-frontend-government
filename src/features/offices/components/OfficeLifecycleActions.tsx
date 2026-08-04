import { Building2Off } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'

import {
  getOfficeDeactivationConsequences,
  getOfficeDeactivationError,
  officeDeactivationSchema,
  type OfficeDeactivationFormValues,
} from '@/features/offices/model/office-deactivation'
import type { OfficeRecord } from '@/features/offices/model/office-model'
import { useDeactivateOfficeMutation } from '@/features/offices/queries/office-deactivation-mutation'
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

const OFFICE_LIFECYCLE_ACTION = 'deactivate' as const

type OfficeLifecycleAction = typeof OFFICE_LIFECYCLE_ACTION

/** Exposes the irreversible office lifecycle action outside the edit workflow. */
export function OfficeLifecycleActions({
  office,
}: Readonly<{ office: OfficeRecord }>) {
  const registry = useMemo(
    () =>
      createResourceActionRegistry<OfficeLifecycleAction>([
        {
          action: OFFICE_LIFECYCLE_ACTION,
          buttonVariant: 'danger',
          description:
            'Die Deaktivierung ist dauerhaft, wird in der Änderungshistorie dokumentiert und kann durch bestehende Abhängigkeiten blockiert werden.',
          dialogTitle: 'Behörde deaktivieren',
          icon: <Building2Off aria-hidden="true" size={18} />,
          label: 'Behörde deaktivieren',
          render: () => <OfficeDeactivationForm office={office} />,
        },
      ]),
    [office],
  )

  return (
    <ResourceActionBar
      allowedActions={[OFFICE_LIFECYCLE_ACTION]}
      ariaLabel="Lebenszyklusaktionen für die Behörde"
      registry={registry}
    />
  )
}

/** Collects the mandatory audit reason and executes one irreversible deactivation. */
function OfficeDeactivationForm({
  office,
}: Readonly<{ office: OfficeRecord }>) {
  const { confirm } = useConfirmation()
  const { notify } = useFeedback()
  const { close } = useResourceActionDialog()
  const mutation = useDeactivateOfficeMutation()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const {
    control,
    formState: { errors, isDirty, isSubmitting, submitCount },
    handleSubmit,
    reset,
  } = useForm<OfficeDeactivationFormValues>({
    defaultValues: { changeReason: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(officeDeactivationSchema),
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
          await mutation.mutateAsync({ officeId: office.id, values })
          reset({ changeReason: '' })
          notify({
            autoDismissAfter: null,
            dedupeKey: `office-deactivated:${office.id}`,
            description:
              'Die Behörde wurde deaktiviert und kann nicht mehr bearbeitet oder neuen Benutzerkonten zugeordnet werden.',
            title: 'Behörde deaktiviert',
            tone: 'success',
          })
          close()
        } catch (error) {
          setSubmissionErrors(createSubmissionErrors(error, office.id))
        }
      })}
    >
      <FormFieldScope>
        <FormErrorSummary
          errors={formErrors}
          focusKey={submitCount}
          shouldFocus
        />

        <section aria-labelledby="office-deactivation-target-heading">
          <h3
            className="text-lg font-semibold"
            id="office-deactivation-target-heading"
          >
            Ausgewählte Behörde
          </h3>
          <p className="text-on-surface-variant mt-2 leading-7">
            <span className="text-on-surface font-semibold">{office.name}</span>
            {office.address?.city
              ? `, ${office.address.city}`
              : office.contactEmail
                ? `, ${office.contactEmail}`
                : ''}
          </p>
        </section>

        <section aria-labelledby="office-deactivation-consequences-heading">
          <h3
            className="text-lg font-semibold"
            id="office-deactivation-consequences-heading"
          >
            Folgen der Deaktivierung
          </h3>
          <ul className="text-on-surface-variant mt-3 list-disc space-y-2 pl-5 leading-7">
            {getOfficeDeactivationConsequences().map((consequence) => (
              <li key={consequence}>{consequence}</li>
            ))}
          </ul>
        </section>

        <ControlledChangeReasonField
          control={control}
          description="Die Begründung wird zusammen mit dem deaktivierten Behördenstand dauerhaft gespeichert."
          name="changeReason"
        />

        <FormActions>
          <FormSubmitButton
            isSubmitting={isSubmitting}
            pendingLabel="Behörde wird deaktiviert …"
            variant="danger"
          >
            Behörde endgültig deaktivieren
          </FormSubmitButton>
        </FormActions>
      </FormFieldScope>
    </form>
  )
}

/** Adds a direct remediation link only for the dependency the frontend can already filter. */
function createSubmissionErrors(
  error: unknown,
  officeId: string,
): FormErrorSummaryItem[] {
  const presentation = getOfficeDeactivationError(error)

  if (presentation.errorCode === 'OFFICE_HAS_ACTIVE_USERS') {
    return [
      {
        message: (
          <>
            {presentation.title}: {presentation.description}{' '}
            <Link
              className="focus-visible:outline-error rounded-sm font-semibold underline decoration-2 underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
              to={`/users?office=${encodeURIComponent(officeId)}&status=active`}
            >
              Aktive Benutzer anzeigen
            </Link>
          </>
        ),
      },
    ]
  }

  return [
    { message: `${presentation.title}: ${presentation.description}` },
  ]
}
