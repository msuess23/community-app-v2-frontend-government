import type { AuthUser, Role } from '@/auth/auth-types'

export const APP_CAPABILITIES = [
  'accessAuthorityClient',
  'viewTicketWorkspace',
  'dispatchTickets',
  'workOnTickets',
  'decideTicketEscalations',
  'viewAppointmentWorkspace',
  'manageAppointmentSlots',
  'manageAppointmentDocuments',
  'manageInfos',
  'viewUsers',
  'manageUsers',
  'viewOffices',
  'manageOffices',
] as const

export type AppCapability = (typeof APP_CAPABILITIES)[number]

const CAPABILITY_ROLES: Readonly<Record<AppCapability, readonly Role[]>> = {
  accessAuthorityClient: ['DISPATCHER', 'OFFICER', 'MANAGER', 'ADMIN'],
  viewTicketWorkspace: ['DISPATCHER', 'OFFICER', 'MANAGER'],
  dispatchTickets: ['DISPATCHER'],
  workOnTickets: ['OFFICER', 'MANAGER'],
  decideTicketEscalations: ['MANAGER'],
  viewAppointmentWorkspace: ['OFFICER', 'MANAGER'],
  manageAppointmentSlots: ['OFFICER', 'MANAGER'],
  manageAppointmentDocuments: ['OFFICER', 'MANAGER'],
  manageInfos: ['OFFICER', 'MANAGER', 'ADMIN'],
  viewUsers: ['DISPATCHER', 'OFFICER', 'MANAGER', 'ADMIN'],
  manageUsers: ['ADMIN'],
  viewOffices: ['DISPATCHER', 'OFFICER', 'MANAGER', 'ADMIN'],
  manageOffices: ['ADMIN'],
}

/** Checks whether the authenticated user may use a named application capability. */
export function hasCapability(
  user: AuthUser | null,
  capability: AppCapability,
): boolean {
  return user !== null && CAPABILITY_ROLES[capability].includes(user.role)
}
