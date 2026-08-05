import { createElement } from 'react'
import { Info as InfoIcon } from 'lucide-react'

import { defineFeatureModule } from '@/app/feature-module'
import { RequireCapability } from '@/auth/RequireCapability'

/** Registers authority-only Info read, create and edit routes with capability guards. */
export const infoFeature = defineFeatureModule({
  capability: 'viewInfos',
  id: 'infos',
  navigation: [
    {
      icon: InfoIcon,
      label: 'Mitteilungen',
      to: '/infos',
    },
  ],
  routes: [
    {
      handle: { pageTitle: 'Mitteilungen' },
      lazy: async () => {
        const { InfoDirectoryPage } = await import(
          '@/features/infos/pages/InfoDirectoryPage'
        )
        return { Component: InfoDirectoryPage }
      },
      path: 'infos',
    },
    {
      children: [
        {
          handle: { pageTitle: 'Mitteilung anlegen' },
          lazy: async () => {
            const { InfoCreatePage } = await import(
              '@/features/infos/pages/InfoCreatePage'
            )
            return { Component: InfoCreatePage }
          },
          path: 'infos/new',
        },
        {
          handle: { pageTitle: 'Mitteilung bearbeiten' },
          lazy: async () => {
            const { InfoEditPage } = await import(
              '@/features/infos/pages/InfoEditPage'
            )
            return { Component: InfoEditPage }
          },
          path: 'infos/:infoId/edit',
        },
      ],
      element: createElement(RequireCapability, {
        capability: 'manageInfos',
      }),
    },
    {
      handle: { pageTitle: 'Mitteilungsdetails' },
      lazy: async () => {
        const { InfoDetailPage } = await import(
          '@/features/infos/pages/InfoDetailPage'
        )
        return { Component: InfoDetailPage }
      },
      path: 'infos/:infoId',
    },
  ],
})
