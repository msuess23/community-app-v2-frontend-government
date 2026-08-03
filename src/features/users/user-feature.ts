import { createElement } from 'react'
import { UsersRound } from 'lucide-react'

import { defineFeatureModule } from '@/app/feature-module'
import { RequireCapability } from '@/auth/RequireCapability'

/** Registers user directory, profile, and administrator-only lifecycle routes. */
export const userFeature = defineFeatureModule({
  capability: 'viewUsers',
  id: 'users',
  navigation: [
    {
      icon: UsersRound,
      label: 'Benutzer',
      to: '/users',
    },
  ],
  routes: [
    {
      handle: { pageTitle: 'Benutzer' },
      lazy: async () => {
        const { UserDirectoryPage } = await import(
          '@/features/users/pages/UserDirectoryPage'
        )
        return { Component: UserDirectoryPage }
      },
      path: 'users',
    },
    {
      handle: { pageTitle: 'Benutzerprofil' },
      lazy: async () => {
        const { UserDetailPage } = await import(
          '@/features/users/pages/UserDetailPage'
        )
        return { Component: UserDetailPage }
      },
      path: 'users/:userId',
    },
    {
      children: [
        {
          handle: { pageTitle: 'Benutzer bearbeiten' },
          lazy: async () => {
            const { UserAdminEditPage } = await import(
              '@/features/users/pages/UserAdminEditPage'
            )
            return { Component: UserAdminEditPage }
          },
          path: 'users/:userId/edit',
        },
        {
          handle: { pageTitle: 'Benutzerhistorie' },
          lazy: async () => {
            const { UserHistoryPage } = await import(
              '@/features/users/pages/UserHistoryPage'
            )
            return { Component: UserHistoryPage }
          },
          path: 'users/:userId/history',
        },
      ],
      element: createElement(RequireCapability, {
        capability: 'manageUsers',
      }),
    },
  ],
})
