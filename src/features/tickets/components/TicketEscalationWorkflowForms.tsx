import {
  EmptyOptionsNotice,
  OptionalCommentField,
  StaffSelectionField,
  WorkflowForm,
} from '@/features/tickets/components/TicketWorkflowFormShared'
import { useWorkflowDialogForm } from '@/features/tickets/components/use-ticket-workflow-dialog-form'
import {
  applyTicketWorkflowSubmissionError,
  decideEscalationSchema,
  escalateTicketSchema,
  getEscalationDecisionLabel,
  toDecideEscalationAction,
  toEscalateTicketAction,
  type DecideEscalationFormValues,
  type EscalateTicketFormValues,
  type TicketWorkflowOptions,
} from '@/features/tickets/model/ticket-workflow'
import type { TicketRecord } from '@/features/tickets/model/ticket-model'
import { useExecuteTicketWorkflowMutation } from '@/features/tickets/queries/ticket-workflow-mutations'
import { ControlledRadioGroupField } from '@/shared/forms/ControlledRadioGroupField'
import { ControlledTextAreaField } from '@/shared/forms/ControlledTextAreaField'

/** Sends a reasoned decision request to one backend-approved manager. */
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
        isRequired
        rows={5}
      />
    </WorkflowForm>
  )
}

/** Records the manager decision and returns the ticket to its prior assignee. */
export function DecideEscalationForm({
  ticket,
}: Readonly<{ ticket: TicketRecord }>) {
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
