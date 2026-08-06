import { describe, expect, it } from 'vitest'

import { appointmentFeature } from '@/features/appointments/appointment-feature'

describe('appointmentFeature', () => {
  it('registers the readable authority appointment workspace routes', () => {
    expect(appointmentFeature.capability).toBe('viewAppointmentWorkspace')
    expect(appointmentFeature.navigation).toEqual([
      expect.objectContaining({ label: 'Termine', to: '/appointments' }),
    ])
    expect(appointmentFeature.routes.map((route) => route.path)).toEqual([
      'appointments',
      'appointments/:appointmentId',
    ])
  })
})
