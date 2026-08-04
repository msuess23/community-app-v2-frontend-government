import { describe, expect, it } from 'vitest'

import { infoFeature } from '@/features/infos/info-feature'

describe('infoFeature', () => {
  it('registers readable routes and role-protected maintenance routes', () => {
    expect(infoFeature.capability).toBe('viewInfos')
    expect(infoFeature.navigation).toEqual([
      expect.objectContaining({ label: 'Mitteilungen', to: '/infos' }),
    ])
    expect(infoFeature.routes[0]).toEqual(
      expect.objectContaining({ path: 'infos' }),
    )
    expect(infoFeature.routes[1]?.children?.map((route) => route.path)).toEqual([
      'infos/new',
      'infos/:infoId/edit',
    ])
    expect(infoFeature.routes[2]).toEqual(
      expect.objectContaining({ path: 'infos/:infoId' }),
    )
  })
})
