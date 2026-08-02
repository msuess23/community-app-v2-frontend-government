import type { LucideIcon } from 'lucide-react'

import type { AppCapability } from '@/auth/capabilities'

/** Describes one capability-protected entry in the authenticated primary navigation. */
export type AppNavigationItem = Readonly<{
  capability: AppCapability
  end?: boolean
  icon: LucideIcon
  label: string
  to: string
}>
