import { describe, expect, it } from 'vitest'

import { appointmentFeature } from '@/features/appointments/appointment-feature'

describe('appointmentFeature', () => {
  it('registers slot management behind its dedicated capability guard', () => {
    expect(appointmentFeature.capability).toBe('viewAppointmentWorkspace')
    expect(appointmentFeature.navigation).toEqual([
      expect.objectContaining({ label: 'Termine', to: '/appointments' }),
    ])
    const slotManagementGroup = appointmentFeature.routes.find(
      (route) => route.children?.[0]?.path === 'appointments/slots',
    )

    expect(slotManagementGroup).toBeDefined()
    expect(slotManagementGroup?.element).toBeTruthy()
    expect(slotManagementGroup?.children?.map((route) => route.path)).toEqual([
      'appointments/slots',
      'appointments/slots/new',
    ])
    expect(
      appointmentFeature.routes
        .filter((route) => !route.children)
        .map((route) => route.path),
    ).toEqual(['appointments', 'appointments/:appointmentId'])
  })
})
