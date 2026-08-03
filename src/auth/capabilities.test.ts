import { describe, expect, it } from 'vitest'

import {
  APP_CAPABILITIES,
  hasCapability,
  type AppCapability,
} from '@/auth/capabilities'
import type { AuthUser, Role } from '@/auth/auth-types'

const EXPECTED_CAPABILITIES: Readonly<Record<Role, readonly AppCapability[]>> =
  {
    CITIZEN: [],
    DISPATCHER: [
      'accessAuthorityClient',
      'viewTicketWorkspace',
      'dispatchTickets',
      'viewUsers',
      'viewOffices',
    ],
    OFFICER: [
      'accessAuthorityClient',
      'viewTicketWorkspace',
      'workOnTickets',
      'viewAppointmentWorkspace',
      'manageAppointmentSlots',
      'manageAppointmentDocuments',
      'manageInfos',
      'viewUsers',
      'viewOffices',
    ],
    MANAGER: [
      'accessAuthorityClient',
      'viewTicketWorkspace',
      'workOnTickets',
      'decideTicketEscalations',
      'viewAppointmentWorkspace',
      'manageAppointmentSlots',
      'manageAppointmentDocuments',
      'manageInfos',
      'viewUsers',
      'viewOffices',
    ],
    ADMIN: [
      'accessAuthorityClient',
      'manageInfos',
      'viewUsers',
      'manageUsers',
      'viewOffices',
      'manageOffices',
    ],
  }

describe('application capabilities', () => {
  it.each(Object.entries(EXPECTED_CAPABILITIES) as [Role, AppCapability[]][])(
    'maps %s to the declared feature capabilities',
    (role, expectedCapabilities) => {
      const granted = APP_CAPABILITIES.filter((capability) =>
        hasCapability(createUser(role), capability),
      )

      expect(granted).toEqual(expectedCapabilities)
    },
  )

  it('denies every capability when no authenticated user exists', () => {
    APP_CAPABILITIES.forEach((capability) => {
      expect(hasCapability(null, capability)).toBe(false)
    })
  })
})

/** Creates a minimal authenticated user for capability checks. */
function createUser(role: Role): AuthUser {
  return {
    email: `${role.toLowerCase()}@test.com`,
    firstName: 'Test',
    id: '00000000-0000-4000-8000-000000000001',
    lastName: 'User',
    officeId: null,
    role,
  }
}
