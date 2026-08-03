import { describe, expect, it } from 'vitest'

import type { AuthUser } from '@/auth/auth-types'
import {
  createUserAdminFormSchema,
  getAssignableRoles,
  hasUserAdminChanges,
  getOfficeAssignmentMode,
  toAdminUserUpdate,
  toUserAdminFormValues,
} from '@/features/users/model/user-admin-form'
import type { UserRecord } from '@/features/users/model/user-model'

const ADMIN: AuthUser = {
  email: 'admin@example.test',
  firstName: 'Ada',
  id: 'admin-id',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}

const CITIZEN: UserRecord = {
  createdAt: '2026-01-01T00:00:00Z',
  deactivatedAt: null,
  email: 'citizen@example.test',
  firstName: 'Clara',
  id: 'citizen-id',
  isActive: true,
  lastName: 'Citizen',
  officeId: null,
  role: 'CITIZEN',
}

describe('user administration form', () => {
  it('requires active-office roles to provide an office', () => {
    const result = createUserAdminFormSchema(CITIZEN, ADMIN).safeParse({
      ...toUserAdminFormValues(CITIZEN),
      changeReason: 'Freischaltung für die Sachbearbeitung',
      role: 'OFFICER',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ['officeId'] }),
      ]),
    )
  })

  it('prevents staff-to-citizen and self-admin demotion choices', () => {
    const staff = { ...CITIZEN, role: 'OFFICER' as const }

    expect(getAssignableRoles(staff, ADMIN)).not.toContain('CITIZEN')
    expect(
      getAssignableRoles(
        { ...staff, id: ADMIN.id, role: 'ADMIN' },
        ADMIN,
      ),
    ).toEqual(['ADMIN'])
  })

  it('normalizes the generated request and clears forbidden offices', () => {
    expect(
      toAdminUserUpdate({
        changeReason: '  Behördliche   Freischaltung  ',
        firstName: ' Clara ',
        lastName: ' Citizen ',
        officeId: 'office-id',
        role: 'ADMIN',
      }),
    ).toEqual({
      change_reason: 'Behördliche Freischaltung',
      first_name: 'Clara',
      last_name: 'Citizen',
      office_id: null,
      role: 'ADMIN',
    })
    expect(getOfficeAssignmentMode('DISPATCHER')).toBe('optional')
    expect(getOfficeAssignmentMode('MANAGER')).toBe('required')
    expect(
      hasUserAdminChanges(
        {
          ...toUserAdminFormValues(CITIZEN),
          changeReason: 'Nur eine Begründung',
        },
        CITIZEN,
      ),
    ).toBe(false)
  })
})
