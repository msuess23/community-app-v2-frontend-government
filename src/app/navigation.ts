import { LayoutDashboard, type LucideIcon } from 'lucide-react'

import type { AppCapability } from '@/auth/capabilities'
import { hasCapability } from '@/auth/capabilities'
import type { AuthUser } from '@/auth/auth-types'

export type PrimaryNavigationItem = Readonly<{
  capability: AppCapability
  end?: boolean
  icon: LucideIcon
  label: string
  to: string
}>

export const PRIMARY_NAVIGATION_ITEMS: readonly PrimaryNavigationItem[] = [
  {
    capability: 'accessAuthorityClient',
    end: true,
    icon: LayoutDashboard,
    label: 'Übersicht',
    to: '/',
  },
]

/**
 * Selects the primary navigation entries available to the current user.
 */
export function getPrimaryNavigationItems(
  user: AuthUser | null,
): readonly PrimaryNavigationItem[] {
  return PRIMARY_NAVIGATION_ITEMS.filter((item) =>
    hasCapability(user, item.capability),
  )
}
