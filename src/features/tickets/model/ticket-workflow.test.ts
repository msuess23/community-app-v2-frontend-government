import { describe, expect, it } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import {
  completeTicketSchema,
  dispatchTicketSchema,
  getStaffOptionDescription,
  getTicketWorkflowErrorPresentation,
  mapTicketWorkflowOptions,
  toCompleteTicketAction,
  toCosignTicketAction,
  toDecideEscalationAction,
  toEscalateTicketAction,
  toForwardTicketAction,
  toPrimaryOfficerAssignmentRequest,
  toRequestCitizenResponseAction,
  toRequestCosignatureAction,
  toReturnToDispatchAction,
  toTicketDispatchRequest,
} from '@/features/tickets/model/ticket-workflow'

describe('ticket workflow model', () => {
  it('maps only the server-provided workflow options into UI references', () => {
    const options = mapTicketWorkflowOptions({
      completion_outcomes: ['RESOLVED', 'REJECTED'],
      cosignature_targets: [],
      escalation_targets: [
        {
          display_name: 'Mara Management',
          id: 'manager-1',
          office: { id: 'office-2', name: 'Ordnungsamt' },
          role: 'MANAGER',
        },
      ],
      forward_targets: [
        {
          display_name: 'Olaf Ordnung',
          id: 'officer-1',
          office: { id: 'office-1', name: 'Tiefbauamt' },
          role: 'OFFICER',
        },
      ],
      offices: [{ id: 'office-1', name: 'Tiefbauamt' }],
      primary_officers: [],
      ticket_id: 'ticket-1',
      version: 7,
    })

    expect(options.version).toBe(7)
    expect(options.offices).toEqual([{ id: 'office-1', name: 'Tiefbauamt' }])
    expect(options.forwardTargets[0]).toMatchObject({
      displayName: 'Olaf Ordnung',
      office: { name: 'Tiefbauamt' },
      role: 'OFFICER',
    })
    expect(getStaffOptionDescription(options.escalationTargets[0])).toBe(
      'Manager, Ordnungsamt',
    )
  })

  it('maps every workflow form to the generated backend command contract', () => {
    expect(
      toTicketDispatchRequest({
        comment: '  Bitte   prüfen. ',
        officeId: 'office-1',
      }),
    ).toEqual({ comment: 'Bitte prüfen.', office_id: 'office-1' })
    expect(
      toPrimaryOfficerAssignmentRequest({
        comment: '',
        primaryOfficerId: 'officer-1',
      }),
    ).toEqual({ comment: null, primary_officer_id: 'officer-1' })
    expect(
      toForwardTicketAction({
        comment: '  Bitte   übernehmen.  ',
        targetUserId: 'officer-2',
      }),
    ).toEqual({
      action: 'FORWARD',
      comment: 'Bitte übernehmen.',
      target_user_id: 'officer-2',
    })
    expect(
      toRequestCosignatureAction({
        comment: '',
        targetUserId: 'officer-3',
      }),
    ).toEqual({
      action: 'REQUEST_COSIGNATURE',
      comment: null,
      target_user_id: 'officer-3',
    })
    expect(toCosignTicketAction({ comment: '' })).toEqual({
      action: 'COSIGN',
      comment: null,
    })
    expect(
      toEscalateTicketAction({
        managerUserId: 'manager-1',
        reason: '  Entscheidung   erforderlich. ',
      }),
    ).toEqual({
      action: 'ESCALATE',
      manager_user_id: 'manager-1',
      reason: 'Entscheidung erforderlich.',
    })
    expect(
      toDecideEscalationAction({ comment: '', decision: 'APPROVED' }),
    ).toEqual({ action: 'DECIDE_ESCALATION', comment: null, decision: 'APPROVED' })
    expect(
      toRequestCitizenResponseAction({
        question: '  Welche   Hausnummer ist betroffen? ',
      }),
    ).toEqual({
      action: 'REQUEST_CITIZEN_RESPONSE',
      question: 'Welche Hausnummer ist betroffen?',
    })
    expect(
      toReturnToDispatchAction({ reason: '  Falsche   Behörde. ' }),
    ).toEqual({ action: 'RETURN_TO_DISPATCH', reason: 'Falsche Behörde.' })
    expect(
      toCompleteTicketAction({
        message: '  Schaden wurde   behoben. ',
        outcome: 'RESOLVED',
      }),
    ).toEqual({
      action: 'COMPLETE',
      message: 'Schaden wurde behoben.',
      outcome: 'RESOLVED',
    })
  })

  it('requires selections and meaningful public workflow text', () => {
    expect(
      dispatchTicketSchema.safeParse({ comment: '', officeId: '' }).success,
    ).toBe(false)
    expect(
      completeTicketSchema.safeParse({ message: 'ok', outcome: 'RESOLVED' })
        .success,
    ).toBe(false)
  })

  it('translates typed workflow conflicts without exposing backend text', () => {
    const presentation = getTicketWorkflowErrorPresentation(
      new ApiError({
        errorCode: 'TICKET_TARGET_NO_LONGER_AVAILABLE',
        message: 'Target row disappeared.',
        status: 409,
      }),
    )

    expect(presentation.title).toBe('Auswahl nicht mehr verfügbar')
    expect(presentation.description).not.toContain('Target row')
  })

  it('keeps unexpected errors generic', () => {
    const presentation = getTicketWorkflowErrorPresentation(
      new Error('Database host leaked.'),
    )

    expect(presentation.title).toBe('Ticketaktion fehlgeschlagen')
    expect(presentation.description).not.toContain('Database host')
  })
})
