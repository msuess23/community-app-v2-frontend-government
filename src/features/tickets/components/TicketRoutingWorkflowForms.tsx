import {
  EmptyOptionsNotice,
  OptionalCommentField,
  StaffSelectionField,
  WorkflowForm,
  useWorkflowDialogForm,
} from '@/features/tickets/components/TicketWorkflowFormShared'
import {
  applyTicketWorkflowSubmissionError,
  assignPrimaryOfficerSchema,
  cosignTicketSchema,
  dispatchTicketSchema,
  targetStaffSchema,
  toCosignTicketAction,
  toForwardTicketAction,
  toPrimaryOfficerAssignmentRequest,
  toRequestCosignatureAction,
  toTicketDispatchRequest,
  type AssignPrimaryOfficerFormValues,
  type CosignTicketFormValues,
  type DispatchTicketFormValues,
  type TargetStaffFormValues,
  type TicketWorkflowOptions,
} from '@/features/tickets/model/ticket-workflow'
import type { TicketRecord } from '@/features/tickets/model/ticket-model'
import {
  useAssignPrimaryOfficerMutation,
  useDispatchTicketMutation,
  useExecuteTicketWorkflowMutation,
} from '@/features/tickets/queries/ticket-workflow-mutations'
import { ControlledSearchableSelectField } from '@/shared/forms/ControlledSearchableSelectField'

export function DispatchTicketForm({
  options,
  ticket,
}: Readonly<{ options: TicketWorkflowOptions; ticket: TicketRecord }>) {
  const mutation = useDispatchTicketMutation()
  const dialog = useWorkflowDialogForm<DispatchTicketFormValues>({
    defaultValues: { comment: '', officeId: '' },
    discardDescription:
      'Die ausgewählte Behörde und der optionale Kommentar gehen verloren.',
    schema: dispatchTicketSchema,
  })
  const hasOptions = options.offices.length > 0

  return (
    <WorkflowForm
      form={dialog.form}
      isDisabled={!hasOptions}
      onSubmit={dialog.form.handleSubmit(async (values) => {
        dialog.setSubmissionErrors([])
        try {
          await mutation.mutateAsync({
            request: toTicketDispatchRequest(values),
            ticketId: ticket.id,
          })
          dialog.form.reset()
          dialog.close()
        } catch (error) {
          dialog.setSubmissionErrors(
            applyTicketWorkflowSubmissionError(error, dialog.form.setError, {
              office_id: 'officeId',
            }),
          )
        }
      })}
      pendingLabel="Ticket wird zugeordnet …"
      submissionErrors={dialog.submissionErrors}
      submitLabel="Ticket zuordnen"
    >
      <EmptyOptionsNotice
        hasOptions={hasOptions}
        message="Aktuell ist keine aktive Behörde für die Zuordnung verfügbar."
      />
      <ControlledSearchableSelectField
        control={dialog.form.control}
        description="Es werden ausschließlich aktive Behörden angeboten, die das Backend für dieses Ticket zulässt."
        label="Zuständige Behörde"
        name="officeId"
        options={options.offices.map((office) => ({
          label: office.name,
          value: office.id,
        }))}
        placeholder="Behörde auswählen"
        required
        searchLabel="Behörden durchsuchen"
      />
      <OptionalCommentField control={dialog.form.control} />
    </WorkflowForm>
  )
}

export function AssignPrimaryOfficerForm({
  isReassignment,
  options,
  ticket,
}: Readonly<{
  isReassignment: boolean
  options: TicketWorkflowOptions
  ticket: TicketRecord
}>) {
  const mutation = useAssignPrimaryOfficerMutation()
  const dialog = useWorkflowDialogForm<AssignPrimaryOfficerFormValues>({
    defaultValues: { comment: '', primaryOfficerId: '' },
    discardDescription:
      'Die ausgewählte Person und der optionale Kommentar gehen verloren.',
    schema: assignPrimaryOfficerSchema,
  })
  const hasOptions = options.primaryOfficers.length > 0

  return (
    <WorkflowForm
      form={dialog.form}
      isDisabled={!hasOptions}
      onSubmit={dialog.form.handleSubmit(async (values) => {
        dialog.setSubmissionErrors([])
        try {
          await mutation.mutateAsync({
            request: toPrimaryOfficerAssignmentRequest(values),
            ticketId: ticket.id,
          })
          dialog.form.reset()
          dialog.close()
        } catch (error) {
          dialog.setSubmissionErrors(
            applyTicketWorkflowSubmissionError(error, dialog.form.setError, {
              primary_officer_id: 'primaryOfficerId',
            }),
          )
        }
      })}
      pendingLabel="Primärzuweisung wird gespeichert …"
      submissionErrors={dialog.submissionErrors}
      submitLabel={
        isReassignment
          ? 'Primären Bearbeiter ersetzen'
          : 'Primären Bearbeiter zuweisen'
      }
    >
      <EmptyOptionsNotice
        hasOptions={hasOptions}
        message="Für die zugeordnete Behörde ist aktuell kein weiterer aktiver Officer verfügbar."
      />
      <StaffSelectionField
        control={dialog.form.control}
        description="Der primäre Bearbeiter bleibt fachlich verantwortlich, auch wenn die aktuelle Koordination später weitergegeben wird."
        label="Primärer Bearbeiter"
        name="primaryOfficerId"
        options={options.primaryOfficers}
      />
      <OptionalCommentField control={dialog.form.control} />
    </WorkflowForm>
  )
}

export function TargetStaffForm({
  action,
  options,
  ticket,
}: Readonly<{
  action: 'FORWARD' | 'REQUEST_COSIGNATURE'
  options: TicketWorkflowOptions
  ticket: TicketRecord
}>) {
  const mutation = useExecuteTicketWorkflowMutation()
  const dialog = useWorkflowDialogForm<TargetStaffFormValues>({
    defaultValues: { comment: '', targetUserId: '' },
    discardDescription:
      'Die ausgewählte Person und der optionale Kommentar gehen verloren.',
    schema: targetStaffSchema,
  })
  const targets =
    action === 'FORWARD' ? options.forwardTargets : options.cosignatureTargets
  const hasOptions = targets.length > 0

  return (
    <WorkflowForm
      form={dialog.form}
      isDisabled={!hasOptions}
      onSubmit={dialog.form.handleSubmit(async (values) => {
        dialog.setSubmissionErrors([])
        try {
          await mutation.mutateAsync({
            request:
              action === 'FORWARD'
                ? toForwardTicketAction(values)
                : toRequestCosignatureAction(values),
            ticketId: ticket.id,
          })
          dialog.form.reset()
          dialog.close()
        } catch (error) {
          dialog.setSubmissionErrors(
            applyTicketWorkflowSubmissionError(error, dialog.form.setError, {
              target_user_id: 'targetUserId',
            }),
          )
        }
      })}
      pendingLabel={
        action === 'FORWARD'
          ? 'Ticket wird weitergeleitet …'
          : 'Mitzeichnung wird angefordert …'
      }
      submissionErrors={dialog.submissionErrors}
      submitLabel={
        action === 'FORWARD' ? 'Ticket weiterleiten' : 'Mitzeichnung anfordern'
      }
    >
      <EmptyOptionsNotice
        hasOptions={hasOptions}
        message="Aktuell ist keine weitere zulässige Zielperson verfügbar."
      />
      <StaffSelectionField
        control={dialog.form.control}
        description={
          action === 'FORWARD'
            ? 'Die ausgewählte Person übernimmt die aktuelle Koordination des Tickets.'
            : 'Die ausgewählte Person erhält das Ticket vorübergehend zur Mitzeichnung; anschließend kehrt es zur bisherigen Bearbeitung zurück.'
        }
        label={action === 'FORWARD' ? 'Weiterleiten an' : 'Mitzeichnung durch'}
        name="targetUserId"
        options={targets}
      />
      <OptionalCommentField control={dialog.form.control} />
    </WorkflowForm>
  )
}

export function CosignTicketForm({ ticket }: Readonly<{ ticket: TicketRecord }>) {
  const mutation = useExecuteTicketWorkflowMutation()
  const dialog = useWorkflowDialogForm<CosignTicketFormValues>({
    defaultValues: { comment: '' },
    discardDescription: 'Der optionale Mitzeichnungskommentar geht verloren.',
    schema: cosignTicketSchema,
  })

  return (
    <WorkflowForm
      form={dialog.form}
      onSubmit={dialog.form.handleSubmit(async (values) => {
        dialog.setSubmissionErrors([])
        try {
          await mutation.mutateAsync({
            request: toCosignTicketAction(values),
            ticketId: ticket.id,
          })
          dialog.form.reset()
          dialog.close()
        } catch (error) {
          dialog.setSubmissionErrors(
            applyTicketWorkflowSubmissionError(error, dialog.form.setError, {
              comment: 'comment',
            }),
          )
        }
      })}
      pendingLabel="Mitzeichnung wird gespeichert …"
      submissionErrors={dialog.submissionErrors}
      submitLabel="Ticket mitzeichnen"
    >
      <p className="text-on-surface-variant leading-7">
        Die Mitzeichnung wird unveränderlich dokumentiert. Danach kehrt das
        Ticket automatisch zur vorherigen Bearbeitung zurück.
      </p>
      <OptionalCommentField
        control={dialog.form.control}
        description="Optionaler fachlicher Hinweis zur Mitzeichnung."
      />
    </WorkflowForm>
  )
}
