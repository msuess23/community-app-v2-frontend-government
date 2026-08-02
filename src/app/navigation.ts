import { LayoutDashboard } from 'lucide-react'

import { FEATURE_NAVIGATION_ITEMS } from '@/app/features'
import type { AppNavigationItem } from '@/app/navigation-types'
import { hasCapability } from '@/auth/capabilities'
import type { AuthUser } from '@/auth/auth-types'

export const PRIMARY_NAVIGATION_ITEMS: readonly AppNavigationItem[] = [
  {
    capability: 'accessAuthorityClient',
    end: true,
    icon: LayoutDashboard,
    label: 'Übersicht',
    to: '/',
  },
  ...FEATURE_NAVIGATION_ITEMS,
]

/**
 * Selects the primary navigation entries available to the current user.
 */
export function getPrimaryNavigationItems(
  user: AuthUser | null,
): readonly AppNavigationItem[] {
  return PRIMARY_NAVIGATION_ITEMS.filter((item) =>
    hasCapability(user, item.capability),
  )
}
