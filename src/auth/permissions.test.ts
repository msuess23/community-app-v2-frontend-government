import { describe, expect, it } from 'vitest'

import {
  canAssignRoles,
  canManageOfficeUsers,
  hasAnyRole,
  hasRole,
  isAuthorityUser,
} from '@/auth/permissions'
import type { AuthUser, Role } from '@/auth/auth-types'

const AUTHORITY_CASES: [Role, boolean][] = [
  ['CITIZEN', false],
  ['DISPATCHER', true],
  ['OFFICER', true],
  ['MANAGER', true],
  ['ADMIN', true],
]

describe('auth permissions', () => {
  it.each(AUTHORITY_CASES)(
    'classifies %s correctly',
    (role: Role, expected: boolean) => {
      expect(isAuthorityUser(createUser(role))).toBe(expected)
    },
  )

  it('keeps role assignment exclusive to administrators', () => {
    expect(canAssignRoles(createUser('ADMIN'))).toBe(true)
    expect(canAssignRoles(createUser('MANAGER'))).toBe(false)
  })

  it('allows managers and administrators to manage office users', () => {
    expect(canManageOfficeUsers(createUser('MANAGER'))).toBe(true)
    expect(canManageOfficeUsers(createUser('ADMIN'))).toBe(true)
    expect(canManageOfficeUsers(createUser('OFFICER'))).toBe(false)
  })

  it('handles missing users and explicit role checks', () => {
    expect(hasRole(null, 'ADMIN')).toBe(false)
    expect(hasAnyRole(null, ['ADMIN'])).toBe(false)
    expect(hasRole(createUser('OFFICER'), 'OFFICER')).toBe(true)
  })
})

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
