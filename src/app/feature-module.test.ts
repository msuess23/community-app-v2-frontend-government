import { FileText } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import {
  createFeatureRegistry,
  defineFeatureModule,
} from '@/app/feature-module'

const infoFeature = defineFeatureModule({
  capability: 'manageInfos',
  id: 'infos',
  navigation: [
    {
      icon: FileText,
      label: 'Informationen',
      to: '/infos',
    },
  ],
  routes: [{ path: 'infos' }],
} as const)

describe('createFeatureRegistry', () => {
  it('protects collected routes and derives navigation capabilities', () => {
    const registry = createFeatureRegistry([infoFeature])

    expect(registry.modules).toEqual([infoFeature])
    expect(registry.routes).toHaveLength(1)
    expect(registry.routes[0]?.children).toEqual([{ path: 'infos' }])
    expect(registry.navigation).toEqual([
      expect.objectContaining({
        capability: 'manageInfos',
        to: '/infos',
      }),
    ])
  })

  it('rejects duplicate feature module ids', () => {
    expect(() => createFeatureRegistry([infoFeature, infoFeature])).toThrow(
      'Duplicate feature module id',
    )
  })

  it('rejects duplicate feature navigation targets', () => {
    expect(() =>
      createFeatureRegistry([
        infoFeature,
        {
          capability: 'manageInfos',
          id: 'other',
          navigation: infoFeature.navigation,
          routes: [{ path: 'other' }],
        },
      ]),
    ).toThrow('Duplicate feature navigation target')
  })

  it('rejects empty and absolute feature route registrations', () => {
    expect(() =>
      createFeatureRegistry([
        {
          capability: 'manageInfos',
          id: 'empty',
          routes: [],
        },
      ]),
    ).toThrow('at least one route')

    expect(() =>
      createFeatureRegistry([
        {
          capability: 'manageInfos',
          id: 'invalid',
          routes: [{ path: '/outside' }],
        },
      ]),
    ).toThrow('must be relative')
  })
})
