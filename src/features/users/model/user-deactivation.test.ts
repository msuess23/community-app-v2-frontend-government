import { describe, expect, it } from 'vitest'

import {
  getUserDeactivationConsequences,
  toUserDeactivateRequest,
} from '@/features/users/model/user-deactivation'
import type { UserRecord } from '@/features/users/model/user-model'

const USER: UserRecord = {
  createdAt: '2026-01-01T00:00:00Z',
  deactivatedAt: null,
  email: 'citizen@example.com',
  firstName: 'Clara',
  id: 'user-1',
  isActive: true,
  lastName: 'Citizen',
  officeId: null,
  role: 'CITIZEN',
}

describe('user deactivation model', () => {
  it('normalizes the mandatory audit reason', () => {
    expect(
      toUserDeactivateRequest({
        changeReason: '  Antrag   der betroffenen Person  ',
      }),
    ).toEqual({ change_reason: 'Antrag der betroffenen Person' })
  })

  it('explains citizen anonymization and appointment guards', () => {
    expect(getUserDeactivationConsequences(USER)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('anonymisiert'),
        expect.stringContaining('Geplante Termine'),
      ]),
    )
  })
})
