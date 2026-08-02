import { Navigate, Outlet } from 'react-router'

import type { AppCapability } from '@/auth/capabilities'
import { hasCapability } from '@/auth/capabilities'
import { useAuth } from '@/auth/auth-context'

export type RequireCapabilityProps = Readonly<{
  capability: AppCapability
  fallbackPath?: string
}>

/**
 * Protects a route with a named application capability instead of a raw role check.
 */
export function RequireCapability({
  capability,
  fallbackPath = '/forbidden',
}: RequireCapabilityProps) {
  const { user } = useAuth()

  if (!hasCapability(user, capability)) {
    return <Navigate replace to={fallbackPath} />
  }

  return <Outlet />
}
