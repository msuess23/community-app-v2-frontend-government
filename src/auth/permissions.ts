import {
  AUTHORITY_ROLES,
  type AuthUser,
  type Role,
} from '@/auth/auth-types'

export function hasRole(user: AuthUser | null, role: Role): boolean {
  return user?.role === role
}

export function hasAnyRole(
  user: AuthUser | null,
  roles: readonly Role[],
): boolean {
  return user !== null && roles.includes(user.role)
}

export function isAuthorityUser(user: AuthUser | null): boolean {
  return hasAnyRole(user, AUTHORITY_ROLES)
}

export function canAssignRoles(user: AuthUser | null): boolean {
  return hasRole(user, 'ADMIN')
}

export function canManageOfficeUsers(user: AuthUser | null): boolean {
  return hasAnyRole(user, ['MANAGER', 'ADMIN'])
}
