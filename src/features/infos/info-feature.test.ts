import { describe, expect, it } from 'vitest'

import { infoFeature } from '@/features/infos/info-feature'

/** Guards route and navigation metadata before the feature joins the app registry. */
describe('infoFeature', () => {
  it('registers readable authority routes without exposing management pages yet', () => {
    expect(infoFeature.capability).toBe('viewInfos')
    expect(infoFeature.navigation).toEqual([
      expect.objectContaining({ label: 'Mitteilungen', to: '/infos' }),
    ])
    expect(infoFeature.routes.map((route) => route.path)).toEqual([
      'infos',
      'infos/:infoId',
    ])
  })
})
