import { describe, expect, it } from 'vitest'

import {
  getAppointmentDurationLabel,
  getAppointmentStatusLabel,
} from '@/features/appointments/model/appointment-model'

describe('appointment model labels', () => {
  it('localizes all lifecycle states', () => {
    expect(getAppointmentStatusLabel('SCHEDULED')).toBe('Geplant')
    expect(getAppointmentStatusLabel('CANCELLED')).toBe('Storniert')
    expect(getAppointmentStatusLabel('COMPLETED')).toBe('Abgeschlossen')
    expect(getAppointmentStatusLabel('NO_SHOW')).toBe('Nicht erschienen')
  })

  it('formats planned duration without deriving lifecycle state', () => {
    expect(
      getAppointmentDurationLabel({
        startsAt: '2026-08-12T08:00:00Z',
        endsAt: '2026-08-12T09:30:00Z',
      }),
    ).toBe('1 Stunde 30 Minuten')
  })

  it('does not present invalid or empty time ranges as a valid duration', () => {
    expect(
      getAppointmentDurationLabel({
        startsAt: '2026-08-12T08:00:00Z',
        endsAt: '2026-08-12T08:00:00Z',
      }),
    ).toBe('Nicht verfügbar')
  })
})
