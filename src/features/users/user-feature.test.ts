import { describe, expect, it } from 'vitest'

import { userFeature } from '@/features/users/user-feature'

describe('userFeature', () => {
  it('keeps administrative lifecycle routes behind a dedicated nested capability guard', () => {
    const administrativeGroup = userFeature.routes.find(
      (route) => route.children?.[0]?.path === 'users/:userId/edit',
    )

    expect(administrativeGroup).toBeDefined()
    expect(administrativeGroup?.element).toBeTruthy()
    expect(administrativeGroup?.children?.map((route) => route.path)).toEqual([
      'users/:userId/edit',
      'users/:userId/history',
    ])
    expect(administrativeGroup?.children?.[1]?.handle).toEqual({
      pageTitle: 'Benutzerhistorie',
    })
  })
})
