import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import {
  accountProfileFormSchema,
  applyAccountProfileSubmissionError,
  toAccountProfileFormValues,
  toUpdateCurrentUserInput,
} from '@/auth/account-form'
import type { AuthUser } from '@/auth/auth-types'

const USER: AuthUser = {
  email: 'ada@example.com',
  firstName: 'Ada',
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Admin',
  officeId: null,
  role: 'ADMIN',
}

describe('account profile form', () => {
  it('normalizes valid profile names for the update request', () => {
    const values = accountProfileFormSchema.parse({
      firstName: '  Ada  ',
      lastName: '  Lovelace  ',
    })

    expect(toUpdateCurrentUserInput(values)).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
    })
  })

  it('builds editable values from the authenticated user', () => {
    expect(toAccountProfileFormValues(USER)).toEqual({
      firstName: 'Ada',
      lastName: 'Admin',
    })
  })

  it('maps backend validation details to profile fields', () => {
    const setError = vi.fn()

    expect(
      applyAccountProfileSubmissionError(
        new ApiError({
          details: [{ field: 'first_name', message: 'Zu kurz' }],
          message: 'Validation failed',
          status: 422,
        }),
        setError,
      ),
    ).toEqual([])
    expect(setError).toHaveBeenCalledWith('firstName', {
      message: 'Zu kurz',
      type: 'server',
    })
  })
})
