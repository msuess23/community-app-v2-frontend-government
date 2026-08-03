import { describe, expect, it } from 'vitest'

import { officeFeature } from '@/features/offices/office-feature'

describe('officeFeature', () => {
  it('registers readable directory and detail routes under viewOffices', () => {
    expect(officeFeature.capability).toBe('viewOffices')
    expect(officeFeature.navigation).toEqual([
      expect.objectContaining({ label: 'Behörden', to: '/offices' }),
    ])
    expect(officeFeature.routes.map((route) => route.path)).toEqual([
      'offices',
      'offices/:officeId',
    ])
  })
})
