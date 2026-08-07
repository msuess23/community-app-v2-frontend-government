import type {
  CompleteTicketAction,
  CosignTicketAction,
  DecideEscalationAction,
  EscalateTicketAction,
  ForwardTicketAction,
  PrimaryOfficerAssignmentRequest,
  RequestCitizenResponseAction,
  RequestCosignatureAction,
  ReturnToDispatchAction,
  TicketDispatchRequest,
} from '@/api/generated/models'
import {
  assignPrimaryOfficerApiV1TicketsTicketIdPrimaryOfficerPost,
  dispatchTicketApiV1TicketsTicketIdDispatchPost,
  executeTicketWorkflowApiV1TicketsTicketIdWorkflowPost,
} from '@/api/generated/tickets/tickets'
import { mapTicketInternalDetailResponse } from '@/features/tickets/model/ticket-mapper'
import type { TicketRecord } from '@/features/tickets/model/ticket-model'
import {
  getTicketWorkflowErrorPresentation,
  TICKET_WORKFLOW_ERROR_MESSAGES,
} from '@/features/tickets/model/ticket-workflow'
import { ticketFeatureQueryKeys } from '@/features/tickets/queries/ticket-query-keys'
import { useResourceActionMutation } from '@/shared/resource-detail/use-resource-action-mutation'

export type DispatchTicketVariables = Readonly<{
  request: TicketDispatchRequest
  ticketId: string
}>

export type AssignPrimaryOfficerVariables = Readonly<{
  request: PrimaryOfficerAssignmentRequest
  ticketId: string
}>

export type ExecuteTicketWorkflowVariables = Readonly<{
  request:
    | CompleteTicketAction
    | CosignTicketAction
    | DecideEscalationAction
    | EscalateTicketAction
    | ForwardTicketAction
    | RequestCitizenResponseAction
    | RequestCosignatureAction
    | ReturnToDispatchAction
  ticketId: string
}>

type TicketWorkflowSuccessFeedback = Readonly<{
  description: string
  title: string
}>

/** Dispatches one inbox ticket and commits only the returned server projection. */
export function useDispatchTicketMutation() {
  return useTicketProjectionMutation<DispatchTicketVariables>({
    mutationFn: async ({ request, ticketId }) =>
      mapTicketInternalDetailResponse(
        await dispatchTicketApiV1TicketsTicketIdDispatchPost(ticketId, request),
      ),
    mutationKey: ['tickets', 'workflow', 'dispatch'],
    successFeedback: {
      description:
        'Die Behörde kann das Ticket jetzt übernehmen und einen primären Bearbeiter zuweisen.',
      title: 'Ticket zugeordnet',
    },
  })
}

/** Assigns or replaces the permanent officer through the dedicated command endpoint. */
export function useAssignPrimaryOfficerMutation() {
  return useTicketProjectionMutation<AssignPrimaryOfficerVariables>({
    mutationFn: async ({ request, ticketId }) =>
      mapTicketInternalDetailResponse(
        await assignPrimaryOfficerApiV1TicketsTicketIdPrimaryOfficerPost(
          ticketId,
          request,
        ),
      ),
    mutationKey: ['tickets', 'workflow', 'primary-officer'],
    successFeedback: {
      description:
        'Die aktuelle Ticketprojektion und der unveränderliche Ereignisstrom wurden aktualisiert.',
      title: 'Primärer Bearbeiter aktualisiert',
    },
  })
}

/** Executes one server-allowed ad-hoc command without optimistic workflow state. */
export function useExecuteTicketWorkflowMutation() {
  return useTicketProjectionMutation<ExecuteTicketWorkflowVariables>({
    mutationFn: async ({ request, ticketId }) =>
      mapTicketInternalDetailResponse(
        await executeTicketWorkflowApiV1TicketsTicketIdWorkflowPost(
          ticketId,
          request,
        ),
      ),
    mutationKey: ['tickets', 'workflow', 'execute'],
    successFeedback: (_, { request }) => getWorkflowSuccessFeedback(request),
  })
}

function useTicketProjectionMutation<TVariables extends { ticketId: string }>(
  options: Readonly<{
    mutationFn: (variables: TVariables) => Promise<TicketRecord>
    mutationKey: readonly string[]
    successFeedback:
      | TicketWorkflowSuccessFeedback
      | ((
          data: TicketRecord,
          variables: TVariables,
        ) => TicketWorkflowSuccessFeedback)
  }>,
) {
  return useResourceActionMutation<TicketRecord, TVariables>({
    conflictQueryKeys: ({ ticketId }) => [
      ticketFeatureQueryKeys.detail(ticketId),
      ticketFeatureQueryKeys.workflowOptions(ticketId),
      ticketFeatureQueryKeys.events(ticketId),
      ticketFeatureQueryKeys.lists(),
    ],
    errorPresentation: {
      fallback: getTicketWorkflowErrorPresentation(undefined),
      messagesByErrorCode: TICKET_WORKFLOW_ERROR_MESSAGES,
    },
    getCachePlan: (_, { ticketId }) => ({
      detailKey: ticketFeatureQueryKeys.detail(ticketId),
      invalidate: [
        ticketFeatureQueryKeys.lists(),
        ticketFeatureQueryKeys.events(ticketId),
        ticketFeatureQueryKeys.workflowOptions(ticketId),
      ],
    }),
    mutationFn: options.mutationFn,
    mutationKey: options.mutationKey,
    successFeedback: options.successFeedback,
  })
}

function getWorkflowSuccessFeedback(
  request: ExecuteTicketWorkflowVariables['request'],
): TicketWorkflowSuccessFeedback {
  switch (request.action) {
    case 'FORWARD':
      return {
        description:
          'Die ausgewählte Person ist jetzt für die weitere Koordination zuständig.',
        title: 'Ticket weitergeleitet',
      }
    case 'REQUEST_COSIGNATURE':
      return {
        description:
          'Das Ticket wartet jetzt auf die angeforderte Mitzeichnung.',
        title: 'Mitzeichnung angefordert',
      }
    case 'COSIGN':
      return {
        description:
          'Die Mitzeichnung wurde dokumentiert und das Ticket an die vorherige Bearbeitung zurückgegeben.',
        title: 'Ticket mitgezeichnet',
      }
    case 'ESCALATE':
      return {
        description:
          'Das Ticket wartet jetzt auf die Entscheidung des ausgewählten Managers.',
        title: 'Ticket eskaliert',
      }
    case 'DECIDE_ESCALATION':
      return {
        description:
          'Die Entscheidung wurde dokumentiert und das Ticket an die vorherige Bearbeitung zurückgegeben.',
        title: 'Eskalation entschieden',
      }
    case 'REQUEST_CITIZEN_RESPONSE':
      return {
        description:
          'Die Bearbeitung pausiert, bis der Bürger die öffentliche Rückfrage beantwortet.',
        title: 'Bürgerantwort angefordert',
      }
    case 'RETURN_TO_DISPATCH':
      return {
        description:
          'Das Ticket liegt wieder in der zentralen Disposition und kann neu zugeordnet werden.',
        title: 'Ticket zurückgegeben',
      }
    case 'COMPLETE':
      return {
        description:
          'Der Abschluss ist öffentlich sichtbar und der Workflow ist beendet.',
        title:
          request.outcome === 'REJECTED'
            ? 'Ticket abgelehnt'
            : 'Ticket erledigt',
      }
  }

  throw new Error('Unbekannte Ticket-Workflowaktion.')
}
