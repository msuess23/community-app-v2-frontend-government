import { useInfiniteQuery } from '@tanstack/react-query'
import {
  useCallback,
  useMemo,
  useState,
  type FormEventHandler,
  type ReactNode,
} from 'react'
import {
  useForm,
  useWatch,
  type DefaultValues,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form'
import type { ZodType } from 'zod'

import {
  applyAppointmentLifecycleSubmissionError,
  cancelAppointmentSchema,
  completeAppointmentSchema,
  markAppointmentNoShowSchema,
  rescheduleAppointmentSchema,
  toAppointmentCancelRequest,
  toAppointmentCompleteRequest,
  toAppointmentNoShowRequest,
  toAppointmentRescheduleRequest,
  type AppointmentAction,
  type CancelAppointmentFormValues,
  type CompleteAppointmentFormValues,
  type MarkAppointmentNoShowFormValues,
  type RescheduleAppointmentFormValues,
} from '@/features/appointments/model/appointment-lifecycle'
import type { AppointmentRecord } from '@/features/appointments/model/appointment-model'
import type { AppointmentSlotRecord } from '@/features/appointments/model/appointment-slot-model'
import { getAppointmentSlotDurationLabel } from '@/features/appointments/model/appointment-slot-model'
import { useExecuteAppointmentLifecycleMutation } from '@/features/appointments/queries/appointment-lifecycle-mutations'
import { createAvailableAppointmentSlotsInfiniteQueryOptions } from '@/features/appointments/queries/appointment-slot-queries'
import { useConfirmation } from '@/shared/confirmation/confirmation-context'
import { ControlledSearchableSelectField } from '@/shared/forms/ControlledSearchableSelectField'
import { ControlledTextAreaField } from '@/shared/forms/ControlledTextAreaField'
import { FormFieldScope } from '@/shared/forms/FormFieldScope'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import {
  useResourceActionCloseGuard,
  useResourceActionDialog,
} from '@/shared/resource-detail/resource-action-dialog-context'
import { Button } from '@/shared/ui/Button'
import { FormActions } from '@/shared/ui/FormActions'
import {
  FormErrorSummary,
  type FormErrorSummaryItem,
} from '@/shared/ui/FormErrorSummary'
import { FormSubmitButton } from '@/shared/ui/FormSubmitButton'

/** Resolves one backend appointment action to its dedicated authority form. */
export function AppointmentLifecycleForm({
  action,
  appointment,
}: Readonly<{
  action: AppointmentAction
  appointment: AppointmentRecord
}>) {
  switch (action) {
    case 'RESCHEDULE':
      return <RescheduleAppointmentForm appointment={appointment} />
    case 'CANCEL':
      return <CancelAppointmentForm appointment={appointment} />
    case 'COMPLETE':
      return <CompleteAppointmentForm appointment={appointment} />
    case 'MARK_NO_SHOW':
      return <MarkAppointmentNoShowForm appointment={appointment} />
  }
}

function RescheduleAppointmentForm({
  appointment,
}: Readonly<{ appointment: AppointmentRecord }>) {
  const [startsFrom] = useState(() => new Date().toISOString())
  const query = useInfiniteQuery(
    createAvailableAppointmentSlotsInfiniteQueryOptions(
      appointment.office.id,
      startsFrom,
    ),
  )

  return (
    <RemoteDataBoundary
      errorOptions={{
        fallback: {
          description:
            'Die freien zukünftigen Terminslots konnten nicht geladen werden. Versuche es erneut.',
          title: 'Terminslots nicht verfügbar',
        },
      }}
      loadingLabel="Freie Terminslots werden geladen."
      query={query}
    >
      {(data) => {
        const slots = data.pages
          .flatMap((page) => page.items)
          .filter((slot) => slot.id !== appointment.currentSlotId)

        return (
          <RescheduleAppointmentLoadedForm
            appointment={appointment}
            hasMoreSlots={query.hasNextPage}
            isLoadingMoreSlots={query.isFetchingNextPage}
            loadMoreSlots={() => void query.fetchNextPage()}
            slots={slots}
          />
        )
      }}
    </RemoteDataBoundary>
  )
}

function RescheduleAppointmentLoadedForm({
  appointment,
  hasMoreSlots,
  isLoadingMoreSlots,
  loadMoreSlots,
  slots,
}: Readonly<{
  appointment: AppointmentRecord
  hasMoreSlots: boolean
  isLoadingMoreSlots: boolean
  loadMoreSlots: () => void
  slots: readonly AppointmentSlotRecord[]
}>) {
  const mutation = useExecuteAppointmentLifecycleMutation()
  const { close, form, setSubmissionErrors, submissionErrors } =
    useAppointmentDialogForm<RescheduleAppointmentFormValues>({
      defaultValues: { reason: '', targetSlotId: '' },
      discardDescription:
        'Der ausgewählte neue Terminslot und die Begründung gehen verloren.',
      schema: rescheduleAppointmentSchema,
    })
  const selectedSlotId = useWatch({ control: form.control, name: 'targetSlotId' })
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId)
  const options = useMemo(
    () =>
      slots.map((slot) => ({
        description: getAppointmentSlotDurationLabel(slot),
        label: `${formatDisplayDateTime(slot.startsAt)} bis ${formatDisplayDateTime(slot.endsAt)} Uhr`,
        value: slot.id,
      })),
    [slots],
  )

  return (
    <LifecycleForm
      form={form}
      isDisabled={slots.length === 0}
      onSubmit={form.handleSubmit(async (values) => {
        setSubmissionErrors([])
        try {
          await mutation.mutateAsync({
            action: 'RESCHEDULE',
            appointmentId: appointment.id,
            request: toAppointmentRescheduleRequest(values),
          })
          form.reset(values)
          close()
        } catch (error) {
          setSubmissionErrors(
            applyAppointmentLifecycleSubmissionError(error, form.setError, {
              reason: 'reason',
              target_slot_id: 'targetSlotId',
            }),
          )
        }
      })}
      pendingLabel="Termin wird verschoben …"
      submissionErrors={submissionErrors}
      submitLabel="Termin verschieben"
    >
      {slots.length === 0 ? (
        <div
          className="border-outline-variant bg-surface-container text-on-surface-variant rounded-lg border p-4 leading-7"
          role="status"
        >
          Für diese Behörde ist derzeit kein anderer freier zukünftiger
          Terminslot vorhanden.
        </div>
      ) : (
        <ControlledSearchableSelectField
          control={form.control}
          description="Es werden ausschließlich freie zukünftige Slots derselben Behörde angeboten."
          emptySearchMessage="Keine passenden freien Terminslots gefunden."
          label="Neuer Terminslot"
          name="targetSlotId"
          options={options}
          placeholder="Terminslot auswählen"
          required
          searchLabel="Freie Terminslots durchsuchen"
        />
      )}

      {hasMoreSlots ? (
        <Button
          isDisabled={isLoadingMoreSlots}
          onPress={loadMoreSlots}
          type="button"
          variant="outline"
        >
          {isLoadingMoreSlots
            ? 'Weitere Terminslots werden geladen …'
            : 'Weitere Terminslots laden'}
        </Button>
      ) : null}

      <ScheduleComparison appointment={appointment} selectedSlot={selectedSlot} />

      <ControlledTextAreaField
        control={form.control}
        description="Die Begründung wird unveränderlich in der internen Ereignishistorie gespeichert."
        isRequired
        label="Begründung"
        maxLength={500}
        name="reason"
        rows={4}
      />
    </LifecycleForm>
  )
}

function CancelAppointmentForm({
  appointment,
}: Readonly<{ appointment: AppointmentRecord }>) {
  const mutation = useExecuteAppointmentLifecycleMutation()
  const { confirm } = useConfirmation()
  const { close, form, setSubmissionErrors, submissionErrors } =
    useAppointmentDialogForm<CancelAppointmentFormValues>({
      defaultValues: { reason: '' },
      discardDescription: 'Die eingegebene Stornierungsbegründung geht verloren.',
      schema: cancelAppointmentSchema,
    })

  return (
    <LifecycleForm
      form={form}
      onSubmit={form.handleSubmit(async (values) => {
        const confirmed = await confirm({
          confirmLabel: 'Termin stornieren',
          description:
            'Der Termin wird endgültig storniert. Der aktuell gebuchte Terminslot wird danach wieder für andere Buchungen freigegeben.',
          initialFocus: 'cancel',
          title: 'Termin wirklich stornieren?',
          tone: 'danger',
        })
        if (!confirmed) return

        setSubmissionErrors([])
        try {
          await mutation.mutateAsync({
            action: 'CANCEL',
            appointmentId: appointment.id,
            request: toAppointmentCancelRequest(values),
          })
          form.reset(values)
          close()
        } catch (error) {
          setSubmissionErrors(
            applyAppointmentLifecycleSubmissionError(error, form.setError, {
              reason: 'reason',
            }),
          )
        }
      })}
      pendingLabel="Termin wird storniert …"
      submissionErrors={submissionErrors}
      submitLabel="Termin stornieren"
      submitVariant="danger"
    >
      <div
        className="border-secondary bg-secondary-container text-on-secondary-container rounded-lg border p-4 leading-7"
        role="note"
      >
        Nach erfolgreicher Stornierung wird der bisherige Terminslot wieder
        freigegeben. Die Stornierung bleibt in der Ereignishistorie erhalten.
      </div>
      <ControlledTextAreaField
        control={form.control}
        description="Die Begründung wird unveränderlich in der internen Ereignishistorie gespeichert."
        isRequired
        label="Stornierungsbegründung"
        maxLength={500}
        name="reason"
        rows={4}
      />
    </LifecycleForm>
  )
}

function CompleteAppointmentForm({
  appointment,
}: Readonly<{ appointment: AppointmentRecord }>) {
  const mutation = useExecuteAppointmentLifecycleMutation()
  const { confirm } = useConfirmation()
  const { close, form, setSubmissionErrors, submissionErrors } =
    useAppointmentDialogForm<CompleteAppointmentFormValues>({
      defaultValues: { comment: '' },
      discardDescription: 'Die noch nicht gespeicherte interne Notiz geht verloren.',
      schema: completeAppointmentSchema,
    })

  return (
    <LifecycleForm
      form={form}
      onSubmit={form.handleSubmit(async (values) => {
        const confirmed = await confirm({
          confirmLabel: 'Termin abschließen',
          description:
            'Der Termin erhält den endgültigen Status „Abgeschlossen“. Der gebuchte Terminslot wird als verbraucht markiert.',
          title: 'Termin als abgeschlossen dokumentieren?',
        })
        if (!confirmed) return

        setSubmissionErrors([])
        try {
          await mutation.mutateAsync({
            action: 'COMPLETE',
            appointmentId: appointment.id,
            request: toAppointmentCompleteRequest(values),
          })
          form.reset(values)
          close()
        } catch (error) {
          setSubmissionErrors(
            applyAppointmentLifecycleSubmissionError(error, form.setError, {
              comment: 'comment',
            }),
          )
        }
      })}
      pendingLabel="Termin wird abgeschlossen …"
      submissionErrors={submissionErrors}
      submitLabel="Termin abschließen"
    >
      <InternalNoteField control={form.control} />
    </LifecycleForm>
  )
}

function MarkAppointmentNoShowForm({
  appointment,
}: Readonly<{ appointment: AppointmentRecord }>) {
  const mutation = useExecuteAppointmentLifecycleMutation()
  const { confirm } = useConfirmation()
  const { close, form, setSubmissionErrors, submissionErrors } =
    useAppointmentDialogForm<MarkAppointmentNoShowFormValues>({
      defaultValues: { comment: '' },
      discardDescription: 'Die noch nicht gespeicherte interne Notiz geht verloren.',
      schema: markAppointmentNoShowSchema,
    })

  return (
    <LifecycleForm
      form={form}
      onSubmit={form.handleSubmit(async (values) => {
        const confirmed = await confirm({
          confirmLabel: 'Nichterscheinen dokumentieren',
          description:
            'Der Termin erhält endgültig den Status „Nicht erschienen“. Der gebuchte Terminslot wird als verbraucht markiert.',
          initialFocus: 'cancel',
          title: 'Nichterscheinen wirklich dokumentieren?',
          tone: 'danger',
        })
        if (!confirmed) return

        setSubmissionErrors([])
        try {
          await mutation.mutateAsync({
            action: 'MARK_NO_SHOW',
            appointmentId: appointment.id,
            request: toAppointmentNoShowRequest(values),
          })
          form.reset(values)
          close()
        } catch (error) {
          setSubmissionErrors(
            applyAppointmentLifecycleSubmissionError(error, form.setError, {
              comment: 'comment',
            }),
          )
        }
      })}
      pendingLabel="Nichterscheinen wird dokumentiert …"
      submissionErrors={submissionErrors}
      submitLabel="Nichterscheinen dokumentieren"
      submitVariant="danger"
    >
      <div
        className="border-error bg-error-container text-on-error-container rounded-lg border p-4 leading-7"
        role="note"
      >
        Verwende diese Aktion ausschließlich, wenn der Bürger zum begonnenen
        Termin nicht erschienen ist. Der Vorgang kann danach nicht fortgesetzt
        werden.
      </div>
      <InternalNoteField control={form.control} />
    </LifecycleForm>
  )
}

function ScheduleComparison({
  appointment,
  selectedSlot,
}: Readonly<{
  appointment: AppointmentRecord
  selectedSlot: AppointmentSlotRecord | undefined
}>) {
  return (
    <section
      aria-labelledby="appointment-reschedule-comparison-heading"
      className="border-outline-variant bg-surface-container-low rounded-lg border p-4"
    >
      <h3
        className="font-semibold"
        id="appointment-reschedule-comparison-heading"
      >
        Terminvergleich
      </h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-on-surface-variant text-sm font-medium">
            Bisheriger Termin
          </dt>
          <dd className="mt-1">
            <time dateTime={appointment.startsAt}>
              {formatDisplayDateTime(appointment.startsAt)}
            </time>{' '}
            bis{' '}
            <time dateTime={appointment.endsAt}>
              {formatDisplayDateTime(appointment.endsAt)} Uhr
            </time>
          </dd>
        </div>
        <div>
          <dt className="text-on-surface-variant text-sm font-medium">
            Neuer Termin
          </dt>
          <dd className="mt-1">
            <span aria-atomic="true" aria-live="polite" role="status">
              {selectedSlot ? (
                <>
                  <time dateTime={selectedSlot.startsAt}>
                    {formatDisplayDateTime(selectedSlot.startsAt)}
                  </time>{' '}
                  bis{' '}
                  <time dateTime={selectedSlot.endsAt}>
                    {formatDisplayDateTime(selectedSlot.endsAt)} Uhr
                  </time>
                </>
              ) : (
                'Noch nicht ausgewählt'
              )}
            </span>
          </dd>
        </div>
      </dl>
    </section>
  )
}

function InternalNoteField<TValues extends FieldValues & { comment: string }>({
  control,
}: Readonly<{ control: UseFormReturn<TValues>['control'] }>) {
  return (
    <ControlledTextAreaField
      control={control}
      description="Optionaler interner Hinweis. Er wird im behördlichen Ereignisstrom gespeichert und Bürgern nicht angezeigt."
      label="Interne Notiz"
      maxLength={1000}
      name={'comment' as FieldPath<TValues>}
      rows={4}
    />
  )
}

function LifecycleForm<TValues extends FieldValues>({
  children,
  form,
  isDisabled = false,
  onSubmit,
  pendingLabel,
  submissionErrors,
  submitLabel,
  submitVariant = 'primary',
}: Readonly<{
  children: ReactNode
  form: UseFormReturn<TValues>
  isDisabled?: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  pendingLabel: string
  submissionErrors: readonly FormErrorSummaryItem[]
  submitLabel: string
  submitVariant?: 'danger' | 'primary'
}>) {
  const errors = [
    ...submissionErrors,
    ...getFormErrorSummary(form.formState.errors),
  ]

  return (
    <form className="space-y-6" noValidate onSubmit={onSubmit}>
      <FormFieldScope>
        <FormErrorSummary
          errors={errors}
          focusKey={form.formState.submitCount}
          shouldFocus
        />
        {children}
        <FormActions>
          <FormSubmitButton
            isDisabled={isDisabled}
            isSubmitting={form.formState.isSubmitting}
            pendingLabel={pendingLabel}
            variant={submitVariant}
          >
            {submitLabel}
          </FormSubmitButton>
        </FormActions>
      </FormFieldScope>
    </form>
  )
}

function useAppointmentDialogForm<TValues extends FieldValues>({
  defaultValues,
  discardDescription,
  schema,
}: Readonly<{
  defaultValues: DefaultValues<TValues>
  discardDescription: string
  schema: ZodType<TValues>
}>) {
  const { confirm } = useConfirmation()
  const { close } = useResourceActionDialog()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const form = useForm<TValues>({
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(schema),
    shouldFocusError: false,
  })
  const requestClose = useCallback(async () => {
    if (!form.formState.isDirty) return true

    return confirm({
      confirmLabel: 'Eingaben verwerfen',
      description: discardDescription,
      title: 'Terminaktion abbrechen?',
    })
  }, [confirm, discardDescription, form.formState.isDirty])
  useResourceActionCloseGuard(requestClose)

  return { close, form, setSubmissionErrors, submissionErrors }
}
