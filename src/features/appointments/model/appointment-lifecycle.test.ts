import { describe, expect, it } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import {
  ALL_APPOINTMENT_ACTIONS,
  cancelAppointmentSchema,
  completeAppointmentSchema,
  getAppointmentLifecycleErrorPresentation,
  rescheduleAppointmentSchema,
  toAppointmentCancelRequest,
  toAppointmentCompleteRequest,
  toAppointmentNoShowRequest,
  toAppointmentRescheduleRequest,
} from '@/features/appointments/model/appointment-lifecycle'

describe('appointment lifecycle model', () => {
  it('covers every backend action and maps normalized requests', () => {
    expect(ALL_APPOINTMENT_ACTIONS).toEqual([
      'RESCHEDULE',
      'CANCEL',
      'COMPLETE',
      'MARK_NO_SHOW',
    ])
    expect(
      toAppointmentRescheduleRequest({
        reason: '  Bessere   Uhrzeit  ',
        targetSlotId: 'slot-2',
      }),
    ).toEqual({ reason: 'Bessere Uhrzeit', target_slot_id: 'slot-2' })
    expect(
      toAppointmentCancelRequest({ reason: '  Bürger   sagt ab  ' }),
    ).toEqual({ reason: 'Bürger sagt ab' })
    expect(toAppointmentCompleteRequest({ comment: '  Erledigt  ' })).toEqual({
      comment: 'Erledigt',
    })
    expect(toAppointmentNoShowRequest({ comment: '   ' })).toEqual({
      comment: null,
    })
  })

  it('enforces backend text boundaries before submission', () => {
    expect(
      rescheduleAppointmentSchema.safeParse({ reason: 'zu', targetSlotId: '' })
        .success,
    ).toBe(false)
    expect(cancelAppointmentSchema.safeParse({ reason: 'abc' }).success).toBe(
      true,
    )
    expect(
      completeAppointmentSchema.safeParse({ comment: 'x'.repeat(1001) }).success,
    ).toBe(false)
  })

  it.each([
    ['APPOINTMENT_ALREADY_STARTED', 'Termin hat bereits begonnen'],
    ['APPOINTMENT_NOT_STARTED', 'Termin noch nicht begonnen'],
    ['APPOINTMENT_NOT_SCHEDULED', 'Aktion nicht mehr verfügbar'],
    ['APPOINTMENT_SLOT_NOT_AVAILABLE', 'Terminslot nicht mehr verfügbar'],
  ])('localizes lifecycle conflict %s', (errorCode, expectedTitle) => {
    const presentation = getAppointmentLifecycleErrorPresentation(
      new ApiError({
        errorCode,
        message: 'Backend detail',
        status: 409,
      }),
    )

    expect(presentation.title).toBe(expectedTitle)
    expect(presentation.description).not.toContain('Backend detail')
  })
})
