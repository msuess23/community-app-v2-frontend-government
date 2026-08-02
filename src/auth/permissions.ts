import { hasCapability } from '@/auth/capabilities'
import type { AuthUser, Role } from '@/auth/auth-types'

/** Checks whether the current user has one exact backend role. */
export function hasRole(user: AuthUser | null, role: Role): boolean {
  return user?.role === role
}

/** Checks whether the current user has at least one role from a supplied set. */
export function hasAnyRole(
  user: AuthUser | null,
  roles: readonly Role[],
): boolean {
  return user !== null && roles.includes(user.role)
}

/** Identifies accounts that may enter the authenticated authority application. */
export function isAuthorityUser(user: AuthUser | null): boolean {
  return hasCapability(user, 'accessAuthorityClient')
}

/** Identifies administrators who may assign authority roles to accounts. */
export function canAssignRoles(user: AuthUser | null): boolean {
  return hasRole(user, 'ADMIN')
}

/** Identifies roles that may inspect or administer office user assignments. */
export function canManageOfficeUsers(user: AuthUser | null): boolean {
  return hasAnyRole(user, ['MANAGER', 'ADMIN'])
}
