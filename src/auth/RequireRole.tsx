import { Navigate, Outlet } from 'react-router'

import { useAuth } from '@/auth/auth-context'
import type { Role } from '@/auth/auth-types'
import { hasAnyRole } from '@/auth/permissions'

export type RequireRoleProps = Readonly<{
  roles: readonly Role[]
}>

export function RequireRole({ roles }: RequireRoleProps) {
  const { user } = useAuth()

  if (!hasAnyRole(user, roles)) {
    return <Navigate replace to="/forbidden" />
  }

  return <Outlet />
}
