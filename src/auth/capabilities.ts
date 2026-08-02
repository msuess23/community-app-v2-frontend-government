import type { AuthUser, Role } from '@/auth/auth-types'

export const APP_CAPABILITIES = ['accessAuthorityClient'] as const

export type AppCapability = (typeof APP_CAPABILITIES)[number]

const CAPABILITY_ROLES: Readonly<Record<AppCapability, readonly Role[]>> = {
  accessAuthorityClient: ['DISPATCHER', 'OFFICER', 'MANAGER', 'ADMIN'],
}

/**
 * Checks whether the authenticated user may use a named application capability.
 */
export function hasCapability(
  user: AuthUser | null,
  capability: AppCapability,
): boolean {
  return user !== null && CAPABILITY_ROLES[capability].includes(user.role)
}
