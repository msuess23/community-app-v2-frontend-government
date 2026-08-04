import { describe, expect, it } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import {
  getOfficeDeactivationConsequences,
  getOfficeDeactivationError,
  toOfficeDeactivateRequest,
} from '@/features/offices/model/office-deactivation'

describe('office deactivation model', () => {
  it('normalizes the mandatory audit reason', () => {
    expect(
      toOfficeDeactivateRequest({
        changeReason: '  Behörde   organisatorisch aufgelöst  ',
      }),
    ).toEqual({ change_reason: 'Behörde organisatorisch aufgelöst' })
  })

  it('explains irreversible lifecycle and dependency consequences', () => {
    expect(getOfficeDeactivationConsequences()).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Reaktivierung'),
        expect.stringContaining('aktive Anliegen'),
        expect.stringContaining('Terminverpflichtungen'),
      ]),
    )
  })

  it('preserves the active-user conflict code for direct remediation', () => {
    expect(
      getOfficeDeactivationError(
        new ApiError({
          errorCode: 'OFFICE_HAS_ACTIVE_USERS',
          message: 'Conflict',
          status: 409,
        }),
      ),
    ).toMatchObject({
      errorCode: 'OFFICE_HAS_ACTIVE_USERS',
      title: 'Aktive Benutzer verhindern die Deaktivierung',
    })
  })
})
