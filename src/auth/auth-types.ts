export const ROLES = [
  'CITIZEN',
  'DISPATCHER',
  'OFFICER',
  'MANAGER',
  'ADMIN',
] as const

export const AUTHORITY_ROLES = [
  'DISPATCHER',
  'OFFICER',
  'MANAGER',
  'ADMIN',
] as const

export type Role = (typeof ROLES)[number]
export type AuthorityRole = (typeof AUTHORITY_ROLES)[number]

export type AuthUser = Readonly<{
  email: string
  firstName: string
  id: string
  lastName: string
  officeId: string | null
  role: Role
}>

export type LoginInput = Readonly<{
  email: string
  password: string
  rememberMe: boolean
}>

export type RegisterInput = Readonly<{
  email: string
  firstName: string
  lastName: string
  password: string
}>

/** Contains the profile fields an authenticated account may edit itself. */
export type UpdateCurrentUserInput = Readonly<{
  firstName: string
  lastName: string
}>

/** Identifies user-visible outcomes when an authenticated session ends. */
export type AuthSessionEndReason =
  | 'logout-all-complete'
  | 'logout-all-local-only'
  | 'refresh-rejected'
  | 'session-ended-in-another-tab'

export type RequestPasswordResetInput = Readonly<{
  email: string
}>

export type ResetPasswordInput = Readonly<{
  email: string
  newPassword: string
  otp: string
}>

export type AuthStatus = 'anonymous' | 'authenticated' | 'initializing'

export type AuthState =
  | Readonly<{
      status: 'anonymous' | 'initializing'
      user: null
    }>
  | Readonly<{
      status: 'authenticated'
      user: AuthUser
    }>
