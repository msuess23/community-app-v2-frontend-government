import type { UseFormSetError } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'

import {
  applyResetPasswordError,
  requestPasswordResetFormSchema,
  resetPasswordFormSchema,
  toRequestPasswordResetInput,
  toResetPasswordInput,
  type ResetPasswordFormValues,
} from '@/auth/password-recovery-form'

describe('password recovery forms', () => {
  it('normalizes a valid reset-code request', () => {
    const values = requestPasswordResetFormSchema.parse({
      email: ' Citizen@Test.COM ',
    })

    expect(toRequestPasswordResetInput(values)).toEqual({
      email: 'citizen@test.com',
    })
  })

  it('requires exactly six digits and matching passwords', () => {
    expect(
      resetPasswordFormSchema.safeParse({
        email: 'citizen@test.com',
        newPassword: 'secret-password',
        otp: '12345a',
        passwordConfirmation: 'different-password',
      }).success,
    ).toBe(false)
  })

  it('uses the same UTF-8 password limit as registration', () => {
    expect(
      resetPasswordFormSchema.safeParse({
        email: 'citizen@test.com',
        newPassword: 'ä'.repeat(37),
        otp: '123456',
        passwordConfirmation: 'ä'.repeat(37),
      }).success,
    ).toBe(false)
  })

  it('maps valid form values to the FastAPI input contract', () => {
    const values = resetPasswordFormSchema.parse({
      email: ' Citizen@Test.COM ',
      newPassword: 'secret-password',
      otp: ' 123456 ',
      passwordConfirmation: 'secret-password',
    })

    expect(toResetPasswordInput(values)).toEqual({
      email: 'citizen@test.com',
      newPassword: 'secret-password',
      otp: '123456',
    })
  })

  it('returns a safe fallback for unknown reset errors', () => {
    const setError = vi.fn() as UseFormSetError<ResetPasswordFormValues>

    expect(
      applyResetPasswordError(new Error('internal detail'), setError),
    ).toEqual([{ message: 'Das Passwort konnte nicht geändert werden.' }])
  })
})
