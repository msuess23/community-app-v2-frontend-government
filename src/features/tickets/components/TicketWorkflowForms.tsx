import type { TicketWorkflowAction } from '@/features/tickets/model/ticket-workflow'
import {
  CompleteTicketForm,
  RequestCitizenResponseForm,
  ReturnToDispatchForm,
} from '@/features/tickets/components/TicketCompletionWorkflowForms'
import {
  DecideEscalationForm,
  EscalateTicketForm,
} from '@/features/tickets/components/TicketEscalationWorkflowForms'
import {
  AssignPrimaryOfficerForm,
  CosignTicketForm,
  DispatchTicketForm,
  TargetStaffForm,
} from '@/features/tickets/components/TicketRoutingWorkflowForms'
import { WorkflowOptionsBoundary } from '@/features/tickets/components/TicketWorkflowFormShared'
import type { TicketRecord } from '@/features/tickets/model/ticket-model'

export interface TicketWorkflowFormProps {
  action: TicketWorkflowAction
  ticket: TicketRecord
}

/** Selects the feature-owned form matching one server-provided workflow command. */
export function TicketWorkflowForm({ action, ticket }: TicketWorkflowFormProps) {
  switch (action) {
    case 'DISPATCH':
      return (
        <WorkflowOptionsBoundary ticket={ticket}>
          {(options) => <DispatchTicketForm options={options} ticket={ticket} />}
        </WorkflowOptionsBoundary>
      )
    case 'ASSIGN_PRIMARY_OFFICER':
    case 'REASSIGN_PRIMARY_OFFICER':
      return (
        <WorkflowOptionsBoundary ticket={ticket}>
          {(options) => (
            <AssignPrimaryOfficerForm
              isReassignment={action === 'REASSIGN_PRIMARY_OFFICER'}
              options={options}
              ticket={ticket}
            />
          )}
        </WorkflowOptionsBoundary>
      )
    case 'FORWARD':
    case 'REQUEST_COSIGNATURE':
      return (
        <WorkflowOptionsBoundary ticket={ticket}>
          {(options) => (
            <TargetStaffForm action={action} options={options} ticket={ticket} />
          )}
        </WorkflowOptionsBoundary>
      )
    case 'COSIGN':
      return <CosignTicketForm ticket={ticket} />
    case 'ESCALATE':
      return (
        <WorkflowOptionsBoundary ticket={ticket}>
          {(options) => <EscalateTicketForm options={options} ticket={ticket} />}
        </WorkflowOptionsBoundary>
      )
    case 'DECIDE_ESCALATION':
      return <DecideEscalationForm ticket={ticket} />
    case 'REQUEST_CITIZEN_RESPONSE':
      return <RequestCitizenResponseForm ticket={ticket} />
    case 'RETURN_TO_DISPATCH':
      return <ReturnToDispatchForm ticket={ticket} />
    case 'COMPLETE':
      return (
        <WorkflowOptionsBoundary ticket={ticket}>
          {(options) => <CompleteTicketForm options={options} ticket={ticket} />}
        </WorkflowOptionsBoundary>
      )
  }

  return null
}
