import { RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'

import {
  applyInfoStatusSubmissionError,
  createInfoStatusUpdateValues,
  getInfoDeletionConsequences,
  getInfoLifecycleErrorPresentation,
  INFO_STATUS_VALUES,
  infoStatusUpdateSchema,
  type InfoStatusUpdateFormValues,
} from '@/features/infos/model/info-lifecycle'
import {
  getInfoStatusLabel,
  type InfoRecord,
} from '@/features/infos/model/info-model'
import {
  useDeleteInfoMutation,
  useUpdateInfoStatusMutation,
} from '@/features/infos/queries/info-lifecycle-mutations'
import { useConfirmation } from '@/shared/confirmation/confirmation-context'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { ControlledSelectField } from '@/shared/forms/ControlledSelectField'
import { ControlledTextAreaField } from '@/shared/forms/ControlledTextAreaField'
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

const UPDATE_STATUS_ACTION = 'update-status' as const
const DELETE_INFO_ACTION = 'delete' as const

type InfoLifecycleAction =
  | typeof UPDATE_STATUS_ACTION
  | typeof DELETE_INFO_ACTION

/** Exposes status maintenance and permanent deletion for one manageable Info. */
export function InfoLifecycleActions({
  info,
  returnTo,
}: Readonly<{ info: InfoRecord; returnTo: string }>) {
  const registry = useMemo(
    () =>
      createResourceActionRegistry<InfoLifecycleAction>([
        {
          action: UPDATE_STATUS_ACTION,
          description:
            'Der neue Status und die optionale Nachricht erscheinen unmittelbar im öffentlichen Statusverlauf. Das Backend erzwingt keine feste Übergangsreihenfolge.',
          dialogTitle: 'Status aktualisieren',
          icon: <RefreshCw aria-hidden="true" size={18} />,
          label: 'Status aktualisieren',
          render: () => <InfoStatusUpdateForm info={info} />,
        },
        {
          action: DELETE_INFO_ACTION,
          buttonVariant: 'danger',
          description:
            'Diese Aktion löscht die Mitteilung und alle zugehörigen Ressourcen dauerhaft. Sie kann nicht rückgängig gemacht werden.',
          dialogTitle: 'Mitteilung endgültig löschen',
          icon: <Trash2 aria-hidden="true" size={18} />,
          label: 'Mitteilung löschen',
          render: () => <InfoDeletionForm info={info} returnTo={returnTo} />,
        },
      ]),
    [info, returnTo],
  )

  return (
    <ResourceActionBar
      allowedActions={[UPDATE_STATUS_ACTION, DELETE_INFO_ACTION]}
      ariaLabel="Lebenszyklusaktionen für die Mitteilung"
      registry={registry}
    />
  )
}

/** Appends one public status row without inventing transitions absent from the backend. */
function InfoStatusUpdateForm({ info }: Readonly<{ info: InfoRecord }>) {
  const { confirm } = useConfirmation()
  const { notify } = useFeedback()
  const { close } = useResourceActionDialog()
  const mutation = useUpdateInfoStatusMutation()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const {
    control,
    formState: { errors, isDirty, isSubmitting, submitCount },
    handleSubmit,
    reset,
    setError,
  } = useForm<InfoStatusUpdateFormValues>({
    defaultValues: createInfoStatusUpdateValues(info.currentStatus.status),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(infoStatusUpdateSchema),
    shouldFocusError: false,
  })
  const requestClose = useCallback(async () => {
    if (!isDirty) {
      return true
    }

    return confirm({
      confirmLabel: 'Eingaben verwerfen',
      description:
        'Der ausgewählte Status und die öffentliche Nachricht gehen verloren, wenn du den Dialog schließt.',
      title: 'Statusaktualisierung abbrechen?',
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
          const statusEntry = await mutation.mutateAsync({
            infoId: info.id,
            values,
          })
          reset(createInfoStatusUpdateValues(statusEntry.status))
          notify({
            dedupeKey: `info-status-updated:${info.id}:${statusEntry.id}`,
            description:
              'Der neue Eintrag ist im öffentlichen Statusverlauf sichtbar.',
            title: `Status auf „${getInfoStatusLabel(statusEntry.status)}“ gesetzt`,
            tone: 'success',
          })
          close()
        } catch (error) {
          setSubmissionErrors(applyInfoStatusSubmissionError(error, setError))
        }
      })}
    >
      <FormFieldScope>
        <FormErrorSummary
          errors={formErrors}
          focusKey={submitCount}
          shouldFocus
        />

        <ControlledSelectField
          control={control}
          description="Auch der aktuelle Status kann erneut gewählt werden, um eine weitere öffentliche Meldung zu veröffentlichen."
          label="Neuer Status"
          name="status"
          options={INFO_STATUS_VALUES.map((status) => ({
            label: getInfoStatusLabel(status),
            value: status,
          }))}
          required
        />

        <ControlledTextAreaField
          control={control}
          description="Optional, öffentlich sichtbar und auf 1000 Zeichen begrenzt. Die Nachricht ist keine interne Bearbeitungsnotiz."
          label="Öffentliche Nachricht"
          maxLength={1000}
          name="message"
          rows={5}
        />

        <FormActions>
          <FormSubmitButton
            isSubmitting={isSubmitting}
            pendingLabel="Status wird aktualisiert …"
          >
            Status veröffentlichen
          </FormSubmitButton>
        </FormActions>
      </FormFieldScope>
    </form>
  )
}

/** Executes the physical delete after explaining every owned resource that is removed. */
function InfoDeletionForm({
  info,
  returnTo,
}: Readonly<{ info: InfoRecord; returnTo: string }>) {
  const navigate = useNavigate()
  const { notify } = useFeedback()
  const { close } = useResourceActionDialog()
  const mutation = useDeleteInfoMutation()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const [submitCount, setSubmitCount] = useState(0)

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmissionErrors([])
    setSubmitCount((current) => current + 1)

    try {
      await mutation.mutateAsync(info.id)
      notify({
        autoDismissAfter: null,
        dedupeKey: `info-deleted:${info.id}`,
        description:
          'Die Mitteilung, ihr Statusverlauf und ihre Bilder wurden dauerhaft gelöscht.',
        title: 'Mitteilung gelöscht',
        tone: 'success',
      })
      close()
      navigate(returnTo, { replace: true })
    } catch (error) {
      const presentation = getInfoLifecycleErrorPresentation(error, 'delete')
      setSubmissionErrors([
        { message: `${presentation.title}: ${presentation.description}` },
      ])
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleDelete}>
      <FormErrorSummary
        errors={submissionErrors}
        focusKey={submitCount}
        shouldFocus
      />

      <section aria-labelledby="info-delete-target-heading">
        <h3 className="text-lg font-semibold" id="info-delete-target-heading">
          Ausgewählte Mitteilung
        </h3>
        <p className="text-on-surface-variant mt-2 leading-7">
          <span className="text-on-surface font-semibold">{info.title}</span>
        </p>
      </section>

      <section aria-labelledby="info-delete-consequences-heading">
        <h3
          className="text-lg font-semibold"
          id="info-delete-consequences-heading"
        >
          Folgen der Löschung
        </h3>
        <ul className="text-on-surface-variant mt-3 list-disc space-y-2 pl-5 leading-7">
          {getInfoDeletionConsequences().map((consequence) => (
            <li key={consequence}>{consequence}</li>
          ))}
        </ul>
      </section>

      <p className="border-error bg-error-container text-on-error-container rounded-lg border p-4 font-semibold leading-7">
        Es gibt keinen Papierkorb und keine Wiederherstellungsfunktion.
      </p>

      <FormActions>
        <FormSubmitButton
          isSubmitting={mutation.isPending}
          pendingLabel="Mitteilung wird gelöscht …"
          variant="danger"
        >
          Mitteilung endgültig löschen
        </FormSubmitButton>
      </FormActions>
    </form>
  )
}
