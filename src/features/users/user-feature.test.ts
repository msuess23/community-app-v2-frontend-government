import { describe, expect, it } from 'vitest'

import { userFeature } from '@/features/users/user-feature'

describe('userFeature', () => {
  it('keeps administrative editing behind a dedicated nested capability guard', () => {
    const administrativeGroup = userFeature.routes.find(
      (route) => route.children?.[0]?.path === 'users/:userId/edit',
    )

    expect(administrativeGroup).toBeDefined()
    expect(administrativeGroup?.element).toBeTruthy()
    expect(administrativeGroup?.children?.[0]?.handle).toEqual({
      pageTitle: 'Benutzer bearbeiten',
    })
  })
})
