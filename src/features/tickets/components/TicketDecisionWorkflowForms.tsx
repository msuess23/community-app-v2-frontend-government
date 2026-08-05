import {
  EmptyOptionsNotice,
  OptionalCommentField,
  StaffSelectionField,
  WorkflowForm,
  useWorkflowDialogForm,
} from '@/features/tickets/components/TicketWorkflowFormShared'
import {
  applyTicketWorkflowSubmissionError,
  completeTicketSchema,
  decideEscalationSchema,
  escalateTicketSchema,
  getEscalationDecisionLabel,
  getTicketCompletionOutcomeLabel,
  requestCitizenResponseSchema,
  returnToDispatchSchema,
  toCompleteTicketAction,
  toDecideEscalationAction,
  toEscalateTicketAction,
  toRequestCitizenResponseAction,
  toReturnToDispatchAction,
  type CompleteTicketFormValues,
  type DecideEscalationFormValues,
  type EscalateTicketFormValues,
  type RequestCitizenResponseFormValues,
  type ReturnToDispatchFormValues,
  type TicketWorkflowOptions,
} from '@/features/tickets/model/ticket-workflow'
import type { TicketRecord } from '@/features/tickets/model/ticket-model'
import { useExecuteTicketWorkflowMutation } from '@/features/tickets/queries/ticket-workflow-mutations'
import { useConfirmation } from '@/shared/confirmation/confirmation-context'
import { ControlledRadioGroupField } from '@/shared/forms/ControlledRadioGroupField'
import { ControlledTextAreaField } from '@/shared/forms/ControlledTextAreaField'

export function EscalateTicketForm({
  options,
  ticket,
}: Readonly<{ options: TicketWorkflowOptions; ticket: TicketRecord }>) {
  const mutation = useExecuteTicketWorkflowMutation()
  const dialog = useWorkflowDialogForm<EscalateTicketFormValues>({
    defaultValues: { managerUserId: '', reason: '' },
    discardDescription:
      'Der ausgewählte Manager und die eingetragene Begründung gehen verloren.',
    schema: escalateTicketSchema,
  })
  const hasOptions = options.escalationTargets.length > 0

  return (
    <WorkflowForm
      form={dialog.form}
      isDisabled={!hasOptions}
      onSubmit={dialog.form.handleSubmit(async (values) => {
        dialog.setSubmissionErrors([])
        try {
          await mutation.mutateAsync({
            request: toEscalateTicketAction(values),
            ticketId: ticket.id,
          })
          dialog.form.reset()
          dialog.close()
        } catch (error) {
          dialog.setSubmissionErrors(
            applyTicketWorkflowSubmissionError(error, dialog.form.setError, {
              manager_user_id: 'managerUserId',
              reason: 'reason',
            }),
          )
        }
      })}
      pendingLabel="Ticket wird eskaliert …"
      submissionErrors={dialog.submissionErrors}
      submitLabel="Eskalation anfordern"
    >
      <EmptyOptionsNotice
        hasOptions={hasOptions}
        message="Aktuell ist kein weiterer aktiver Manager für eine Eskalation verfügbar."
      />
      <StaffSelectionField
        control={dialog.form.control}
        description="Der ausgewählte Manager trifft die Entscheidung und gibt das Ticket anschließend an die bisherige Bearbeitung zurück."
        label="Entscheidender Manager"
        name="managerUserId"
        options={options.escalationTargets}
      />
      <ControlledTextAreaField
        control={dialog.form.control}
        description="Die Begründung wird dauerhaft im Ereignisstrom dokumentiert."
        label="Begründung"
        maxLength={1000}
        name="reason"
        required
        rows={5}
      />
    </WorkflowForm>
  )
}

export function DecideEscalationForm({ ticket }: Readonly<{ ticket: TicketRecord }>) {
  const mutation = useExecuteTicketWorkflowMutation()
  const dialog = useWorkflowDialogForm<DecideEscalationFormValues>({
    defaultValues: { comment: '', decision: 'APPROVED' },
    discardDescription:
      'Die ausgewählte Entscheidung und der optionale Kommentar gehen verloren.',
    schema: decideEscalationSchema,
  })

  return (
    <WorkflowForm
      form={dialog.form}
      onSubmit={dialog.form.handleSubmit(async (values) => {
        dialog.setSubmissionErrors([])
        try {
          await mutation.mutateAsync({
            request: toDecideEscalationAction(values),
            ticketId: ticket.id,
          })
          dialog.form.reset()
          dialog.close()
        } catch (error) {
          dialog.setSubmissionErrors(
            applyTicketWorkflowSubmissionError(error, dialog.form.setError, {
              comment: 'comment',
              decision: 'decision',
            }),
          )
        }
      })}
      pendingLabel="Entscheidung wird gespeichert …"
      submissionErrors={dialog.submissionErrors}
      submitLabel="Entscheidung dokumentieren"
    >
      <ControlledRadioGroupField
        control={dialog.form.control}
        description="Die Entscheidung beendet nur die Eskalation. Das Ticket kehrt anschließend zur vorherigen Bearbeitung zurück."
        isRequired
        label="Entscheidung"
        name="decision"
        options={(['APPROVED', 'REJECTED'] as const).map((decision) => ({
          description:
            decision === 'APPROVED'
              ? 'Die eskalierte Vorgehensweise wird genehmigt.'
              : 'Die eskalierte Vorgehensweise wird abgelehnt.',
          label: getEscalationDecisionLabel(decision),
          value: decision,
        }))}
        orientation="horizontal"
      />
      <OptionalCommentField
        control={dialog.form.control}
        description="Optionaler fachlicher Hinweis zur Entscheidung."
      />
    </WorkflowForm>
  )
}

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
        required
        rows={5}
      />
    </WorkflowForm>
  )
}

export function ReturnToDispatchForm({ ticket }: Readonly<{ ticket: TicketRecord }>) {
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
        required
        rows={5}
      />
    </WorkflowForm>
  )
}

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
        required
        rows={5}
      />
    </WorkflowForm>
  )
}
