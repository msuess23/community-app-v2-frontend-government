import { describe, expect, it } from 'vitest'

import { officeFeature } from '@/features/offices/office-feature'

describe('officeFeature', () => {
  it('registers readable routes and administrator-only maintenance routes', () => {
    expect(officeFeature.capability).toBe('viewOffices')
    expect(officeFeature.navigation).toEqual([
      expect.objectContaining({ label: 'Behörden', to: '/offices' }),
    ])
    expect(officeFeature.routes[0]).toEqual(
      expect.objectContaining({ path: 'offices' }),
    )
    expect(officeFeature.routes[1]?.children?.map((route) => route.path)).toEqual(
      ['offices/new', 'offices/:officeId/edit'],
    )
    expect(officeFeature.routes[2]).toEqual(
      expect.objectContaining({ path: 'offices/:officeId' }),
    )
  })
})
