import { AlertTriangle, MessageSquarePlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  applyTicketCommentSubmissionError,
  createTicketCommentFormValues,
  mapTicketCommentFormToRequest,
  TICKET_COMMENT_MAX_LENGTH,
  ticketCommentFormSchema,
  type TicketCommentFormValues,
} from '@/features/tickets/model/ticket-comment-form'
import { useAddTicketCommentMutation } from '@/features/tickets/queries/ticket-comment-mutations'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { ControlledRadioGroupField } from '@/shared/forms/ControlledRadioGroupField'
import { ControlledTextAreaField } from '@/shared/forms/ControlledTextAreaField'
import { FormFieldScope } from '@/shared/forms/FormFieldScope'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import { FormActions } from '@/shared/ui/FormActions'
import {
  FormErrorSummary,
  type FormErrorSummaryItem,
} from '@/shared/ui/FormErrorSummary'
import { FormSubmitButton } from '@/shared/ui/FormSubmitButton'

/** Appends immutable staff communication with a privacy-safe internal default. */
export function TicketCommentComposer({
  ticketId,
}: Readonly<{ ticketId: string }>) {
  const mutation = useAddTicketCommentMutation()
  const { notify } = useFeedback()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const {
    control,
    formState: { errors, isSubmitting, submitCount },
    handleSubmit,
    reset,
    setError,
    watch,
  } = useForm<TicketCommentFormValues>({
    defaultValues: createTicketCommentFormValues(),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(ticketCommentFormSchema),
    shouldFocusError: false,
  })
  const visibility = watch('visibility')
  const formErrors = [...submissionErrors, ...getFormErrorSummary(errors)]

  return (
    <form
      className="border-outline-variant bg-surface-container-low mb-6 rounded-xl border p-4 sm:p-5"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setSubmissionErrors([])

        try {
          const comment = await mutation.mutateAsync({
            request: mapTicketCommentFormToRequest(values),
            ticketId,
          })
          reset(createTicketCommentFormValues())
          notify({
            dedupeKey: `ticket-comment:${ticketId}:${comment.id}`,
            description: comment.isInternal
              ? 'Die interne Notiz wurde unveränderlich im Ticketverlauf gespeichert.'
              : 'Der Kommentar ist öffentlich sichtbar und wurde unveränderlich im Ticketverlauf gespeichert.',
            title: comment.isInternal
              ? 'Interne Notiz gespeichert'
              : 'Öffentlichen Kommentar gespeichert',
            tone: 'success',
          })
        } catch (error) {
          setSubmissionErrors(
            applyTicketCommentSubmissionError(error, setError),
          )
        }
      })}
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="bg-primary-container text-on-primary-container flex size-10 shrink-0 items-center justify-center rounded-full">
          <MessageSquarePlus aria-hidden="true" size={19} />
        </span>
        <div>
          <h3 className="text-lg font-semibold">Eintrag hinzufügen</h3>
          <p className="text-on-surface-variant mt-1 text-sm leading-6">
            Kommentare und Notizen werden als neue Ereignisse angehängt. Bereits
            gespeicherte Einträge können nicht bearbeitet oder gelöscht werden.
          </p>
        </div>
      </div>

      <FormFieldScope>
        <FormErrorSummary
          errors={formErrors}
          focusKey={submitCount}
          shouldFocus
        />

        <ControlledRadioGroupField
          control={control}
          description="Interne Notizen sind nur für berechtigte Behördenmitarbeiter sichtbar. Öffentliche Kommentare können Bürger sehen."
          isRequired
          label="Sichtbarkeit"
          name="visibility"
          options={[
            { label: 'Interne Notiz', value: 'INTERNAL' },
            { label: 'Öffentlicher Kommentar', value: 'PUBLIC' },
          ]}
          orientation="vertical"
        />

        {visibility === 'PUBLIC' ? (
          <div
            className="border-warning bg-warning-container text-on-warning-container flex gap-3 rounded-lg border p-4"
            role="alert"
          >
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 shrink-0"
              size={20}
            />
            <div>
              <p className="font-semibold">Öffentlich sichtbar</p>
              <p className="mt-1 text-sm leading-6">
                Prüfe den Text vor dem Speichern auf personenbezogene oder rein
                interne Informationen. Die Veröffentlichung kann anschließend
                nicht über die Oberfläche zurückgenommen werden.
              </p>
            </div>
          </div>
        ) : null}

        <ControlledTextAreaField
          control={control}
          label={
            visibility === 'PUBLIC'
              ? 'Öffentlicher Kommentar'
              : 'Interne Notiz'
          }
          isRequired
          maxLength={TICKET_COMMENT_MAX_LENGTH}
          name="text"
          rows={5}
        />

        <FormActions>
          <FormSubmitButton
            isSubmitting={isSubmitting}
            pendingLabel="Eintrag wird gespeichert …"
          >
            {visibility === 'PUBLIC'
              ? 'Kommentar veröffentlichen'
              : 'Notiz speichern'}
          </FormSubmitButton>
        </FormActions>
      </FormFieldScope>
    </form>
  )
}
