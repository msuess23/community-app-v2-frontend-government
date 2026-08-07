import { describe, expect, it } from 'vitest'

import type { AuthUser } from '@/auth/auth-types'
import type { InfoRecord } from '@/features/infos/model/info-model'
import {
  canCreateInfo,
  canManageInfo,
} from '@/features/infos/model/info-permissions'

const baseUser: AuthUser = {
  email: 'user@example.test',
  firstName: 'Ute',
  id: 'user-id',
  lastName: 'User',
  officeId: 'office-a',
  role: 'OFFICER',
}
const baseInfo = {
  officeId: 'office-a',
} as InfoRecord

describe('Info permissions', () => {
  it('allows case workers to create and manage only for their own office', () => {
    expect(canCreateInfo(baseUser)).toBe(true)
    expect(canManageInfo(baseUser, baseInfo)).toBe(true)
    expect(canManageInfo(baseUser, { ...baseInfo, officeId: 'office-b' })).toBe(
      false,
    )
  })

  it('requires an office assignment for non-admin creation', () => {
    expect(canCreateInfo({ ...baseUser, officeId: null })).toBe(false)
  })

  it('allows administrators to manage cross-office and unassigned Infos', () => {
    const admin = { ...baseUser, officeId: null, role: 'ADMIN' as const }
    expect(canCreateInfo(admin)).toBe(true)
    expect(canManageInfo(admin, { ...baseInfo, officeId: null })).toBe(true)
  })
})
