import {
  EmptyOptionsNotice,
  WorkflowForm,
} from '@/features/tickets/components/TicketWorkflowFormShared'
import { useWorkflowDialogForm } from '@/features/tickets/components/use-ticket-workflow-dialog-form'
import {
  applyTicketWorkflowSubmissionError,
  completeTicketSchema,
  getTicketCompletionOutcomeLabel,
  requestCitizenResponseSchema,
  returnToDispatchSchema,
  toCompleteTicketAction,
  toRequestCitizenResponseAction,
  toReturnToDispatchAction,
  type CompleteTicketFormValues,
  type RequestCitizenResponseFormValues,
  type ReturnToDispatchFormValues,
  type TicketWorkflowOptions,
} from '@/features/tickets/model/ticket-workflow'
import type { TicketRecord } from '@/features/tickets/model/ticket-model'
import { useExecuteTicketWorkflowMutation } from '@/features/tickets/queries/ticket-workflow-mutations'
import { useConfirmation } from '@/shared/confirmation/confirmation-context'
import { ControlledRadioGroupField } from '@/shared/forms/ControlledRadioGroupField'
import { ControlledTextAreaField } from '@/shared/forms/ControlledTextAreaField'

/** Publishes a question and pauses authority processing until the citizen replies. */
export function RequestCitizenResponseForm({
  ticket,
}: Readonly<{ ticket: TicketRecord }>) {
  const mutation = useExecuteTicketWorkflowMutation()
  const dialog = useWorkflowDialogForm<RequestCitizenResponseFormValues>({
    defaultValues: { question: '' },
    discardDescription: 'Die eingetragene öffentliche Rückfrage geht verloren.',
    schema: requestCitizenResponseSchema,
  })

  return (
    <WorkflowForm
      form={dialog.form}
      onSubmit={dialog.form.handleSubmit(async (values) => {
        dialog.setSubmissionErrors([])
        try {
          await mutation.mutateAsync({
            request: toRequestCitizenResponseAction(values),
            ticketId: ticket.id,
          })
          dialog.form.reset()
          dialog.close()
        } catch (error) {
          dialog.setSubmissionErrors(
            applyTicketWorkflowSubmissionError(error, dialog.form.setError, {
              question: 'question',
            }),
          )
        }
      })}
      pendingLabel="Rückfrage wird veröffentlicht …"
      submissionErrors={dialog.submissionErrors}
      submitLabel="Bürgerantwort anfordern"
    >
      <div
        className="border-secondary bg-secondary-container text-on-secondary-container rounded-lg border p-4"
        role="note"
      >
        Die Rückfrage ist für den Ersteller des Tickets sichtbar. Die interne
        Bearbeitung pausiert, bis eine Antwort eingeht.
      </div>
      <ControlledTextAreaField
        control={dialog.form.control}
        description="Formuliere klar, welche Information für die weitere Bearbeitung fehlt."
        label="Öffentliche Rückfrage"
        maxLength={1000}
        name="question"
        isRequired
        rows={5}
      />
    </WorkflowForm>
  )
}

/** Returns a misrouted ticket to dispatch after an explicit destructive confirmation. */
export function ReturnToDispatchForm({
  ticket,
}: Readonly<{ ticket: TicketRecord }>) {
  const { confirm } = useConfirmation()
  const mutation = useExecuteTicketWorkflowMutation()
  const dialog = useWorkflowDialogForm<ReturnToDispatchFormValues>({
    defaultValues: { reason: '' },
    discardDescription: 'Die eingetragene Rückgabebegründung geht verloren.',
    schema: returnToDispatchSchema,
  })

  return (
    <WorkflowForm
      form={dialog.form}
      onSubmit={dialog.form.handleSubmit(async (values) => {
        const confirmed = await confirm({
          confirmLabel: 'Zur Disposition zurückgeben',
          description:
            'Behörde, primärer Bearbeiter und aktuelle Zuständigkeit werden zurückgesetzt. Die bisherige Bearbeitung bleibt im Ereignisstrom erhalten.',
          title: 'Ticket wirklich zurückgeben?',
          tone: 'danger',
        })
        if (!confirmed) return

        dialog.setSubmissionErrors([])
        try {
          await mutation.mutateAsync({
            request: toReturnToDispatchAction(values),
            ticketId: ticket.id,
          })
          dialog.form.reset()
          dialog.close()
        } catch (error) {
          dialog.setSubmissionErrors(
            applyTicketWorkflowSubmissionError(error, dialog.form.setError, {
              reason: 'reason',
            }),
          )
        }
      })}
      pendingLabel="Ticket wird zurückgegeben …"
      submissionErrors={dialog.submissionErrors}
      submitLabel="Zur Disposition zurückgeben"
      submitVariant="danger"
    >
      <ControlledTextAreaField
        control={dialog.form.control}
        description="Die Begründung wird dauerhaft im Ereignisstrom gespeichert."
        label="Rückgabebegründung"
        maxLength={1000}
        name="reason"
        isRequired
        rows={5}
      />
    </WorkflowForm>
  )
}

/** Completes the workflow with only the outcomes approved by the backend. */
export function CompleteTicketForm({
  options,
  ticket,
}: Readonly<{ options: TicketWorkflowOptions; ticket: TicketRecord }>) {
  const { confirm } = useConfirmation()
  const mutation = useExecuteTicketWorkflowMutation()
  const defaultOutcome = options.completionOutcomes[0] ?? 'RESOLVED'
  const dialog = useWorkflowDialogForm<CompleteTicketFormValues>({
    defaultValues: { message: '', outcome: defaultOutcome },
    discardDescription:
      'Das ausgewählte Resultat und die öffentliche Abschlussnachricht gehen verloren.',
    schema: completeTicketSchema,
  })
  const hasOptions = options.completionOutcomes.length > 0

  return (
    <WorkflowForm
      form={dialog.form}
      isDisabled={!hasOptions}
      onSubmit={dialog.form.handleSubmit(async (values) => {
        if (!options.completionOutcomes.includes(values.outcome)) {
          dialog.form.setError('outcome', {
            message:
              'Dieses Abschlussresultat ist für deine Rolle nicht verfügbar.',
            type: 'validate',
          })
          return
        }

        const confirmed = await confirm({
          confirmLabel:
            values.outcome === 'REJECTED'
              ? 'Ticket ablehnen'
              : 'Ticket erledigen',
          description:
            'Der Workflow wird terminal abgeschlossen. Das Resultat und die Nachricht sind anschließend öffentlich sichtbar.',
          title: 'Ticket wirklich abschließen?',
          tone: values.outcome === 'REJECTED' ? 'danger' : 'default',
        })
        if (!confirmed) return

        dialog.setSubmissionErrors([])
        try {
          await mutation.mutateAsync({
            request: toCompleteTicketAction(values),
            ticketId: ticket.id,
          })
          dialog.form.reset()
          dialog.close()
        } catch (error) {
          dialog.setSubmissionErrors(
            applyTicketWorkflowSubmissionError(error, dialog.form.setError, {
              message: 'message',
              outcome: 'outcome',
            }),
          )
        }
      })}
      pendingLabel="Ticket wird abgeschlossen …"
      submissionErrors={dialog.submissionErrors}
      submitLabel="Ticket abschließen"
    >
      <EmptyOptionsNotice
        hasOptions={hasOptions}
        message="Für deine Rolle ist aktuell kein Abschlussresultat verfügbar."
      />
      <ControlledRadioGroupField
        control={dialog.form.control}
        description="Officer können Tickets als erledigt abschließen. Manager dürfen zusätzlich eine Ablehnung dokumentieren."
        isRequired
        label="Abschlussresultat"
        name="outcome"
        options={options.completionOutcomes.map((outcome) => ({
          description:
            outcome === 'REJECTED'
              ? 'Das Anliegen wird mit einer öffentlich sichtbaren Begründung abgelehnt.'
              : 'Das Anliegen wird als erledigt gekennzeichnet.',
          label: getTicketCompletionOutcomeLabel(outcome),
          value: outcome,
        }))}
        orientation="horizontal"
      />
      <ControlledTextAreaField
        control={dialog.form.control}
        description="Die Nachricht ist öffentlich sichtbar und sollte das Ergebnis verständlich erklären."
        label="Öffentliche Abschlussnachricht"
        maxLength={1000}
        name="message"
        isRequired
        rows={5}
      />
    </WorkflowForm>
  )
}
