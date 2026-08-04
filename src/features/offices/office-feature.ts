import { createElement } from 'react'
import { Building2 } from 'lucide-react'

import { defineFeatureModule } from '@/app/feature-module'
import { RequireCapability } from '@/auth/RequireCapability'

/** Registers office directory, detail, and administrator-only maintenance routes. */
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
      children: [
        {
          handle: { pageTitle: 'Behörde anlegen' },
          lazy: async () => {
            const { OfficeCreatePage } = await import(
              '@/features/offices/pages/OfficeCreatePage'
            )
            return { Component: OfficeCreatePage }
          },
          path: 'offices/new',
        },
        {
          handle: { pageTitle: 'Behörde bearbeiten' },
          lazy: async () => {
            const { OfficeEditPage } = await import(
              '@/features/offices/pages/OfficeEditPage'
            )
            return { Component: OfficeEditPage }
          },
          path: 'offices/:officeId/edit',
        },
        {
          handle: { pageTitle: 'Behördenhistorie' },
          lazy: async () => {
            const { OfficeHistoryPage } = await import(
              '@/features/offices/pages/OfficeHistoryPage'
            )
            return { Component: OfficeHistoryPage }
          },
          path: 'offices/:officeId/history',
        },
      ],
      element: createElement(RequireCapability, {
        capability: 'manageOffices',
      }),
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
