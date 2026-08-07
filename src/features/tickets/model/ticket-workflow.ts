import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'
import { z } from 'zod'

import { isApiError } from '@/api/client/api-error'
import { getApiErrorPresentation } from '@/api/client/api-error-presentation'
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
  Role,
  StaffUserReference,
  TicketCompletionOutcome,
  TicketDispatchRequest,
  TicketWorkflowAction,
  TicketWorkflowOptionsResponse,
} from '@/api/generated/models'

import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

export type { TicketWorkflowAction } from '@/api/generated/models'

export const ALL_TICKET_WORKFLOW_ACTIONS = [
  'DISPATCH',
  'ASSIGN_PRIMARY_OFFICER',
  'REASSIGN_PRIMARY_OFFICER',
  'FORWARD',
  'REQUEST_COSIGNATURE',
  'COSIGN',
  'ESCALATE',
  'DECIDE_ESCALATION',
  'REQUEST_CITIZEN_RESPONSE',
  'RETURN_TO_DISPATCH',
  'COMPLETE',
] as const satisfies readonly TicketWorkflowAction[]

export const ESCALATION_DECISIONS = ['APPROVED', 'REJECTED'] as const
export const TICKET_COMPLETION_OUTCOMES = ['RESOLVED', 'REJECTED'] as const satisfies readonly TicketCompletionOutcome[]

export const TICKET_WORKFLOW_ERROR_MESSAGES = {
  TICKET_ACTION_NOT_ALLOWED: {
    description:
      'Die Aktion ist im aktuellen Ticketzustand nicht mehr verfügbar. Der Ticketstand wurde neu geladen.',
    title: 'Aktion nicht mehr verfügbar',
  },
  TICKET_COMPLETION_OUTCOME_NOT_ALLOWED: {
    description: 'Das gewählte Abschlussresultat ist für deine Rolle nicht zulässig.',
    title: 'Abschlussresultat nicht erlaubt',
  },
  TICKET_NOT_FOUND: {
    description:
      'Das Ticket wurde entfernt oder liegt nicht mehr in deinem Zuständigkeitsbereich.',
    title: 'Ticket nicht verfügbar',
  },
  TICKET_PROJECTION_VERSION_MISMATCH: {
    description:
      'Der gespeicherte Ticketstand ist vorübergehend inkonsistent. Es wurde keine Aktion ausgeführt.',
    title: 'Ticketstand muss geprüft werden',
  },
  TICKET_SELF_TARGET_NOT_ALLOWED: {
    description: 'Du kannst dich für diese Aktion nicht selbst als Zielperson auswählen.',
    title: 'Zielperson nicht zulässig',
  },
  TICKET_TARGET_ALREADY_SELECTED: {
    description: 'Die ausgewählte Person besitzt diese Zuständigkeit bereits.',
    title: 'Zuständigkeit bereits vergeben',
  },
  TICKET_TARGET_NO_LONGER_AVAILABLE: {
    description:
      'Die ausgewählte Person oder Behörde ist nicht mehr verfügbar. Die Auswahlmöglichkeiten wurden aktualisiert.',
    title: 'Auswahl nicht mehr verfügbar',
  },
  TICKET_TARGET_NOT_ELIGIBLE: {
    description: 'Die ausgewählte Person erfüllt die Anforderungen dieser Aktion nicht.',
    title: 'Zielperson nicht zulässig',
  },
} as const

const optionalCommentSchema = z
  .string()
  .trim()
  .max(1000, 'Der optionale Kommentar darf höchstens 1000 Zeichen haben.')
const requiredWorkflowTextSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(3, `${label} muss mindestens 3 Zeichen enthalten.`)
    .max(1000, `${label} darf höchstens 1000 Zeichen haben.`)
const requiredSelectionSchema = (message: string) => z.string().trim().min(1, message)

export const dispatchTicketSchema = z.object({
  comment: optionalCommentSchema,
  officeId: requiredSelectionSchema('Wähle eine Behörde aus.'),
})
export const assignPrimaryOfficerSchema = z.object({
  comment: optionalCommentSchema,
  primaryOfficerId: requiredSelectionSchema('Wähle einen primären Bearbeiter aus.'),
})
export const targetStaffSchema = z.object({
  comment: optionalCommentSchema,
  targetUserId: requiredSelectionSchema('Wähle eine Zielperson aus.'),
})
export const cosignTicketSchema = z.object({ comment: optionalCommentSchema })
export const escalateTicketSchema = z.object({
  managerUserId: requiredSelectionSchema('Wähle einen Manager aus.'),
  reason: requiredWorkflowTextSchema('Die Begründung'),
})
export const decideEscalationSchema = z.object({
  comment: optionalCommentSchema,
  decision: z.enum(ESCALATION_DECISIONS, {
    error: 'Wähle eine Entscheidung aus.',
  }),
})
export const requestCitizenResponseSchema = z.object({
  question: requiredWorkflowTextSchema('Die Rückfrage'),
})
export const returnToDispatchSchema = z.object({
  reason: requiredWorkflowTextSchema('Die Begründung'),
})
export const completeTicketSchema = z.object({
  message: requiredWorkflowTextSchema('Die öffentliche Abschlussnachricht'),
  outcome: z.enum(TICKET_COMPLETION_OUTCOMES, {
    error: 'Wähle ein Abschlussresultat aus.',
  }),
})

export type DispatchTicketFormValues = z.infer<typeof dispatchTicketSchema>
export type AssignPrimaryOfficerFormValues = z.infer<typeof assignPrimaryOfficerSchema>
export type TargetStaffFormValues = z.infer<typeof targetStaffSchema>
export type CosignTicketFormValues = z.infer<typeof cosignTicketSchema>
export type EscalateTicketFormValues = z.infer<typeof escalateTicketSchema>
export type DecideEscalationFormValues = z.infer<typeof decideEscalationSchema>
export type RequestCitizenResponseFormValues = z.infer<typeof requestCitizenResponseSchema>
export type ReturnToDispatchFormValues = z.infer<typeof returnToDispatchSchema>
export type CompleteTicketFormValues = z.infer<typeof completeTicketSchema>

export type TicketWorkflowOfficeOption = Readonly<{ id: string; name: string }>
export type TicketWorkflowUserOption = Readonly<{
  displayName: string
  id: string
  office: TicketWorkflowOfficeOption | null
  role: Role
}>
export type TicketWorkflowOptions = Readonly<{
  completionOutcomes: readonly TicketCompletionOutcome[]
  cosignatureTargets: readonly TicketWorkflowUserOption[]
  escalationTargets: readonly TicketWorkflowUserOption[]
  forwardTargets: readonly TicketWorkflowUserOption[]
  offices: readonly TicketWorkflowOfficeOption[]
  primaryOfficers: readonly TicketWorkflowUserOption[]
  ticketId: string
  version: number
}>

/** Converts server-filtered workflow targets into stable feature-owned options. */
export function mapTicketWorkflowOptions(
  response: TicketWorkflowOptionsResponse,
): TicketWorkflowOptions {
  return {
    completionOutcomes: response.completion_outcomes ?? [],
    cosignatureTargets: (response.cosignature_targets ?? []).map(mapStaffOption),
    escalationTargets: (response.escalation_targets ?? []).map(mapStaffOption),
    forwardTargets: (response.forward_targets ?? []).map(mapStaffOption),
    offices: (response.offices ?? []).map((office) => ({
      id: office.id,
      name: office.name,
    })),
    primaryOfficers: (response.primary_officers ?? []).map(mapStaffOption),
    ticketId: response.ticket_id,
    version: response.version,
  }
}

function mapStaffOption(option: StaffUserReference): TicketWorkflowUserOption {
  return {
    displayName: option.display_name,
    id: option.id,
    office: option.office
      ? { id: option.office.id, name: option.office.name }
      : null,
    role: option.role,
  }
}

export function toTicketDispatchRequest(values: DispatchTicketFormValues): TicketDispatchRequest {
  return { comment: normalizeOptionalText(values.comment), office_id: values.officeId }
}

export function toPrimaryOfficerAssignmentRequest(
  values: AssignPrimaryOfficerFormValues,
): PrimaryOfficerAssignmentRequest {
  return {
    comment: normalizeOptionalText(values.comment),
    primary_officer_id: values.primaryOfficerId,
  }
}

export function toForwardTicketAction(values: TargetStaffFormValues): ForwardTicketAction {
  return {
    action: 'FORWARD',
    comment: normalizeOptionalText(values.comment),
    target_user_id: values.targetUserId,
  }
}

export function toRequestCosignatureAction(
  values: TargetStaffFormValues,
): RequestCosignatureAction {
  return {
    action: 'REQUEST_COSIGNATURE',
    comment: normalizeOptionalText(values.comment),
    target_user_id: values.targetUserId,
  }
}

export function toCosignTicketAction(values: CosignTicketFormValues): CosignTicketAction {
  return { action: 'COSIGN', comment: normalizeOptionalText(values.comment) }
}

export function toEscalateTicketAction(values: EscalateTicketFormValues): EscalateTicketAction {
  return {
    action: 'ESCALATE',
    manager_user_id: values.managerUserId,
    reason: normalizeRequiredText(values.reason),
  }
}

export function toDecideEscalationAction(
  values: DecideEscalationFormValues,
): DecideEscalationAction {
  return {
    action: 'DECIDE_ESCALATION',
    comment: normalizeOptionalText(values.comment),
    decision: values.decision,
  }
}

export function toRequestCitizenResponseAction(
  values: RequestCitizenResponseFormValues,
): RequestCitizenResponseAction {
  return {
    action: 'REQUEST_CITIZEN_RESPONSE',
    question: normalizeRequiredText(values.question),
  }
}

export function toReturnToDispatchAction(
  values: ReturnToDispatchFormValues,
): ReturnToDispatchAction {
  return { action: 'RETURN_TO_DISPATCH', reason: normalizeRequiredText(values.reason) }
}

export function toCompleteTicketAction(values: CompleteTicketFormValues): CompleteTicketAction {
  return {
    action: 'COMPLETE',
    message: normalizeRequiredText(values.message),
    outcome: values.outcome,
  }
}

/** Converts workflow failures into stable localized feedback for dialogs and toasts. */
export function getTicketWorkflowErrorPresentation(error: unknown) {
  return getApiErrorPresentation(error, {
    fallback: {
      description:
        'Die Ticketaktion konnte nicht abgeschlossen werden. Lade den aktuellen Stand und versuche es erneut.',
      title: 'Ticketaktion fehlgeschlagen',
    },
    messagesByErrorCode: TICKET_WORKFLOW_ERROR_MESSAGES,
  })
}

/** Maps backend field details where possible and summarizes every remaining error safely. */
export function applyTicketWorkflowSubmissionError<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>,
  aliases: Readonly<Record<string, FieldPath<TValues>>>,
): FormErrorSummaryItem[] {
  if (isApiError(error)) {
    let mapped = false
    let unmapped = false

    for (const detail of error.details) {
      const rawField = detail.field?.replace(/^body\./, '')
      if (!rawField) {
        unmapped = true
        continue
      }

      const field = aliases[rawField]
      if (!field) {
        unmapped = true
        continue
      }

      mapped = true
      setError(field, {
        message: getFieldErrorMessage(rawField),
        type: 'server',
      })
    }

    if (mapped && !unmapped) {
      return []
    }
  }

  const presentation = getTicketWorkflowErrorPresentation(error)
  return [{ message: `${presentation.title}: ${presentation.description}` }]
}

export function getTicketCompletionOutcomeLabel(outcome: TicketCompletionOutcome): string {
  return outcome === 'REJECTED' ? 'Abgelehnt' : 'Erledigt'
}

export function getEscalationDecisionLabel(decision: (typeof ESCALATION_DECISIONS)[number]): string {
  return decision === 'APPROVED' ? 'Genehmigen' : 'Ablehnen'
}

export function getStaffOptionDescription(option: TicketWorkflowUserOption): string {
  const role = option.role === 'MANAGER' ? 'Manager' : 'Officer'
  return option.office ? `${role}, ${option.office.name}` : role
}

function getFieldErrorMessage(field: string): string {
  if (field === 'comment') return 'Der Kommentar darf höchstens 1000 Zeichen haben.'
  if (field === 'message') return 'Die Abschlussnachricht muss 3 bis 1000 Zeichen enthalten.'
  if (field === 'question') return 'Die Rückfrage muss 3 bis 1000 Zeichen enthalten.'
  if (field === 'reason') return 'Die Begründung muss 3 bis 1000 Zeichen enthalten.'
  if (field === 'outcome') return 'Wähle ein zulässiges Abschlussresultat aus.'
  if (field === 'decision') return 'Wähle eine gültige Entscheidung aus.'
  return 'Wähle einen gültigen Eintrag aus.'
}

function normalizeRequiredText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeOptionalText(value: string): string | null {
  return normalizeRequiredText(value) || null
}
