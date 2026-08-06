import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from 'react-hook-form'
import { useNavigate } from 'react-router'

import {
  createAppointmentSlotBatchSchema,
  createEmptyAppointmentSlotBatchValues,
  getAppointmentSlotBatchPreview,
  getAppointmentSlotBatchSubmissionErrors,
  getMinimumLocalDateTimeValue,
  MAX_APPOINTMENT_SLOTS_PER_BATCH,
  type AppointmentSlotBatchFormValues,
} from '@/features/appointments/model/appointment-slot-form'
import { useCreateAppointmentSlotsMutation } from '@/features/appointments/queries/appointment-slot-queries'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { ControlledTextField } from '@/shared/forms/ControlledTextField'
import { FormFieldScope } from '@/shared/forms/FormFieldScope'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { useUnsavedChangesGuard } from '@/shared/forms/use-unsaved-changes-guard'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import { toZonedDateTimeIso } from '@/shared/format/local-date-time'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { FormActions } from '@/shared/ui/FormActions'
import {
  FormErrorSummary,
  type FormErrorSummaryItem,
} from '@/shared/ui/FormErrorSummary'
import { FormSubmitButton } from '@/shared/ui/FormSubmitButton'
import { LinkButton } from '@/shared/ui/LinkButton'

/** Edits, validates, previews and submits one bounded slot-capacity batch. */
export function AppointmentSlotBatchForm({
  officeId,
}: Readonly<{ officeId: string }>) {
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement | null>(null)
  const { notify } = useFeedback()
  const mutation = useCreateAppointmentSlotsMutation()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const schema = useMemo(() => createAppointmentSlotBatchSchema(), [])
  const minimumDateTime = useMemo(() => getMinimumLocalDateTimeValue(), [])
  const {
    control,
    formState: { errors, isDirty, isSubmitting, submitCount },
    handleSubmit,
    reset,
  } = useForm<AppointmentSlotBatchFormValues>({
    defaultValues: createEmptyAppointmentSlotBatchValues(),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(schema),
    shouldFocusError: false,
  })
  const { append, fields, remove } = useFieldArray({ control, name: 'slots' })
  const slots = useWatch({ control, name: 'slots' }) ?? []
  const preview = getAppointmentSlotBatchPreview({ slots })
  const { allowNextNavigation } = useUnsavedChangesGuard({
    hasUnsavedChanges: isDirty,
    message: {
      description:
        'Die noch nicht gespeicherten Terminslots gehen verloren, wenn du die Seite verlässt.',
      title: 'Terminsloterstellung verlassen?',
    },
  })
  const formErrors = [...submissionErrors, ...getFormErrorSummary(errors)]

  return (
    <form
      className="space-y-6"
      ref={formRef}
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setSubmissionErrors([])

        try {
          const createdSlots = await mutation.mutateAsync({ officeId, values })
          reset(createEmptyAppointmentSlotBatchValues())
          notify({
            dedupeKey: `appointment-slots-created:${createdSlots
              .map((slot) => slot.id)
              .join(':')}`,
            description: `${createdSlots.length} ${
              createdSlots.length === 1 ? 'Terminslot wurde' : 'Terminslots wurden'
            } angelegt und sind für Bürger buchbar.`,
            title: 'Terminslots angelegt',
            tone: 'success',
          })
          allowNextNavigation()
          navigate('/appointments/slots')
        } catch (error) {
          setSubmissionErrors(getAppointmentSlotBatchSubmissionErrors(error))
        }
      })}
    >
      <FormFieldScope>
        <FormErrorSummary
          errors={formErrors}
          focusKey={submitCount}
          shouldFocus
        />

        <section aria-labelledby="appointment-slot-intervals-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                className="text-xl font-semibold"
                id="appointment-slot-intervals-heading"
              >
                Zeitintervalle
              </h2>
              <p className="text-on-surface-variant mt-2 max-w-3xl leading-7">
                Lege bis zu {MAX_APPOINTMENT_SLOTS_PER_BATCH} zukünftige,
                überschneidungsfreie Intervalle an. Die Reihenfolge der Eingabe
                ist beliebig; der Batch wird chronologisch übermittelt.
              </p>
            </div>
            <p className="text-on-surface-variant text-sm font-medium" aria-live="polite">
              {fields.length} von {MAX_APPOINTMENT_SLOTS_PER_BATCH} Slots
            </p>
          </div>

          <ol aria-label="Neue Terminslots" className="mt-5 grid gap-4">
            {fields.map((field, index) => (
              <li data-appointment-slot-row key={field.id}>
                <fieldset className="border-outline-variant bg-surface-container-low rounded-xl border p-4 sm:p-5">
                  <legend className="px-1 text-base font-semibold">
                    Terminslot {index + 1}
                  </legend>
                  <div className="grid gap-4 pt-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
                    <ControlledTextField
                      control={control}
                      inputLang="de-DE"
                      isRequired
                      label={`Beginn von Terminslot ${index + 1}`}
                      min={minimumDateTime}
                      name={
                        `slots.${index}.startsAt` as FieldPath<AppointmentSlotBatchFormValues>
                      }
                      step={300}
                      type="datetime-local"
                    />
                    <ControlledTextField
                      control={control}
                      inputLang="de-DE"
                      isRequired
                      label={`Ende von Terminslot ${index + 1}`}
                      min={slots[index]?.startsAt || minimumDateTime}
                      name={
                        `slots.${index}.endsAt` as FieldPath<AppointmentSlotBatchFormValues>
                      }
                      step={300}
                      type="datetime-local"
                    />
                    <Button
                      aria-label={`Terminslot ${index + 1} entfernen`}
                      className="md:mt-7"
                      isDisabled={fields.length === 1}
                      onPress={() => {
                        remove(index)
                        requestAnimationFrame(() => {
                          const rows =
                            formRef.current?.querySelectorAll<HTMLElement>(
                              '[data-appointment-slot-row]',
                            )
                          const targetIndex = Math.min(
                            index,
                            Math.max((rows?.length ?? 1) - 1, 0),
                          )
                          rows
                            ?.item(targetIndex)
                            .querySelector<HTMLInputElement>('input')
                            ?.focus()
                        })
                      }}
                      type="button"
                      variant="outline"
                    >
                      <Trash2 aria-hidden="true" size={18} />
                      <span className="md:sr-only">Entfernen</span>
                    </Button>
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>

          <Button
            className="mt-4"
            isDisabled={fields.length >= MAX_APPOINTMENT_SLOTS_PER_BATCH}
            onPress={() =>
              append({ endsAt: '', startsAt: '' }, { shouldFocus: true })
            }
            type="button"
            variant="secondary"
          >
            <Plus aria-hidden="true" size={18} />
            Terminslot hinzufügen
          </Button>
        </section>

        <Card padding="md" variant="subtle">
          <section aria-labelledby="appointment-slot-preview-heading">
            <h2
              className="text-lg font-semibold"
              id="appointment-slot-preview-heading"
            >
              Chronologische Vorschau
            </h2>
            {preview.length === 0 ? (
              <p className="text-on-surface-variant mt-3 leading-7">
                Vervollständige mindestens ein gültiges Intervall, um die
                sortierte Vorschau zu sehen.
              </p>
            ) : (
              <ol className="mt-4 grid gap-3" aria-label="Sortierte Slotvorschau">
                {preview.map((slot, index) => {
                  const startsAt = toZonedDateTimeIso(slot.startsAt)
                  const endsAt = toZonedDateTimeIso(slot.endsAt)

                  return (
                    <li
                      className="border-outline-variant bg-surface rounded-lg border p-3"
                      key={`${slot.originalIndex}-${slot.startsAt}-${slot.endsAt}`}
                    >
                      <span className="font-semibold">{index + 1}.</span>{' '}
                      <time dateTime={startsAt}>
                        {formatDisplayDateTime(startsAt)} Uhr
                      </time>{' '}
                      bis{' '}
                      <time dateTime={endsAt}>
                        {formatDisplayDateTime(endsAt)} Uhr
                      </time>
                      <span className="text-on-surface-variant ml-2 text-sm">
                        (Eingabe {slot.originalIndex + 1})
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </Card>

        <FormActions>
          <LinkButton to="/appointments/slots" variant="outline">
            Abbrechen
          </LinkButton>
          <FormSubmitButton
            isSubmitting={isSubmitting || mutation.isPending}
            pendingLabel="Terminslots werden angelegt …"
          >
            {fields.length === 1
              ? 'Terminslot anlegen'
              : `${fields.length} Terminslots anlegen`}
          </FormSubmitButton>
        </FormActions>
      </FormFieldScope>
    </form>
  )
}
