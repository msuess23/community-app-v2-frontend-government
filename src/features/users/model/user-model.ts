import type { Role } from '@/auth/auth-types'

/** Represents one user account after transport DTOs have crossed the feature boundary. */
export type UserRecord = Readonly<{
  createdAt: string
  deactivatedAt: string | null
  email: string
  firstName: string
  id: string
  isActive: boolean
  lastName: string
  officeId: string | null
  role: Role
}>

/** Returns the authority-facing display name for one account. */
export function getUserDisplayName(user: UserRecord): string {
  return `${user.firstName} ${user.lastName}`.trim()
}
