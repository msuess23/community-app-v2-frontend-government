import { describe, expect, it } from 'vitest'

import { hasCapability } from '@/auth/capabilities'
import type { AuthUser, Role } from '@/auth/auth-types'

const ACCESS_CASES: readonly [Role, boolean][] = [
  ['CITIZEN', false],
  ['DISPATCHER', true],
  ['OFFICER', true],
  ['MANAGER', true],
  ['ADMIN', true],
]

describe('application capabilities', () => {
  it.each(ACCESS_CASES)(
    'maps %s to authority-client access',
    (role, expected) => {
      expect(
        hasCapability(createUser(role), 'accessAuthorityClient'),
      ).toBe(expected)
    },
  )

  it('denies capabilities when no authenticated user exists', () => {
    expect(hasCapability(null, 'accessAuthorityClient')).toBe(false)
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
