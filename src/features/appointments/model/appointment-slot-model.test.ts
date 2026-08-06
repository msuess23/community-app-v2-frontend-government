import { describe, expect, it } from 'vitest'

import {
  canDeactivateAppointmentSlot,
  getAppointmentSlotDurationLabel,
  getAppointmentSlotEffectiveStatus,
} from '@/features/appointments/model/appointment-slot-model'

describe('appointment slot model', () => {
  it('derives expired availability without changing the persisted status', () => {
    const slot = {
      startsAt: '2026-08-06T08:00:00Z',
      status: 'AVAILABLE' as const,
    }
    const now = new Date('2026-08-06T09:00:00Z')

    expect(getAppointmentSlotEffectiveStatus(slot, now)).toBe('EXPIRED')
    expect(canDeactivateAppointmentSlot(slot, now)).toBe(false)
  })

  it('keeps future free slots available and formats their duration', () => {
    const slot = {
      endsAt: '2026-08-06T10:30:00Z',
      startsAt: '2026-08-06T09:00:00Z',
      status: 'AVAILABLE' as const,
    }

    expect(
      getAppointmentSlotEffectiveStatus(
        slot,
        new Date('2026-08-06T08:00:00Z'),
      ),
    ).toBe('AVAILABLE')
    expect(
      canDeactivateAppointmentSlot(slot, new Date('2026-08-06T08:00:00Z')),
    ).toBe(true)
    expect(getAppointmentSlotDurationLabel(slot)).toBe('1 Stunde 30 Minuten')
  })
})
