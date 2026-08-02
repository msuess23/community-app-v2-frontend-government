import { describe, expect, it } from 'vitest'

import { appRoutes } from '@/app/router'
import { getSafeReturnTo } from '@/auth/auth-redirect'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { PublicLayout } from '@/shared/layout/PublicLayout'

describe('password recovery routing', () => {
  it('registers both recovery pages as public root children', () => {
    const root = appRoutes.find((route) => route.path === '/')

    const publicRoutes = root?.children?.find(
      (route) => route.Component === PublicLayout,
    )?.children

    expect(publicRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Component: ForgotPasswordPage,
          path: 'password-forgotten',
        }),
        expect.objectContaining({
          Component: ResetPasswordPage,
          path: 'password-reset',
        }),
      ]),
    )
  })

  it('does not accept recovery entry pages as post-login targets', () => {
    expect(getSafeReturnTo('/password-forgotten')).toBe('/')
    expect(getSafeReturnTo('/password-reset?email=test%40example.com')).toBe('/')
  })
})
