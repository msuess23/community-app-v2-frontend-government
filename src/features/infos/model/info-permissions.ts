import type { AuthUser } from '@/auth/auth-types'
import type { InfoRecord } from '@/features/infos/model/info-model'

/** Returns whether the current authority account may create an Info. */
export function canCreateInfo(user: AuthUser): boolean {
  return (
    user.role === 'ADMIN' ||
    ((user.role === 'OFFICER' || user.role === 'MANAGER') &&
      user.officeId !== null)
  )
}

/** Mirrors the backend object rule for mutable Info resources. */
export function canManageInfo(user: AuthUser, info: InfoRecord): boolean {
  if (user.role === 'ADMIN') {
    return true
  }

  return (
    (user.role === 'OFFICER' || user.role === 'MANAGER') &&
    info.officeId !== null &&
    user.officeId === info.officeId
  )
}
