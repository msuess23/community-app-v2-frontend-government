import { Info as InfoIcon } from 'lucide-react'

import { defineFeatureModule } from '@/app/feature-module'

/** Registers the authority-only readable Info directory and detail routes. */
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
