import type { Role } from '@/auth/auth-types'

const ROLE_LABELS: Readonly<Record<Role, string>> = {
  ADMIN: 'Administration',
  CITIZEN: 'Bürgerkonto',
  DISPATCHER: 'Disposition',
  MANAGER: 'Leitung',
  OFFICER: 'Sachbearbeitung',
}

/**
 * Returns the localized role name used in navigation and account summaries.
 */
export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role]
}
