import { Building2 } from 'lucide-react'

import { defineFeatureModule } from '@/app/feature-module'

/** Registers the readable office directory and backend-authorized detail route. */
export const officeFeature = defineFeatureModule({
  capability: 'viewOffices',
  id: 'offices',
  navigation: [
    {
      icon: Building2,
      label: 'Behörden',
      to: '/offices',
    },
  ],
  routes: [
    {
      handle: { pageTitle: 'Behörden' },
      lazy: async () => {
        const { OfficeDirectoryPage } = await import(
          '@/features/offices/pages/OfficeDirectoryPage'
        )
        return { Component: OfficeDirectoryPage }
      },
      path: 'offices',
    },
    {
      handle: { pageTitle: 'Behördendetails' },
      lazy: async () => {
        const { OfficeDetailPage } = await import(
          '@/features/offices/pages/OfficeDetailPage'
        )
        return { Component: OfficeDetailPage }
      },
      path: 'offices/:officeId',
    },
  ],
})
