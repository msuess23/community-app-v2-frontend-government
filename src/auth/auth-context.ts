import { createContext, useContext } from 'react'

import type {
  AuthState,
  AuthUser,
  LoginInput,
  RegisterInput,
} from '@/auth/auth-types'

export type AuthContextValue = Readonly<{
  isAuthenticated: boolean
  isInitializing: boolean
  login: (input: LoginInput) => Promise<AuthUser>
  logout: () => Promise<void>
  logoutAll: () => Promise<void>
  refreshCurrentUser: () => Promise<AuthUser>
  register: (input: RegisterInput) => Promise<AuthUser>
  state: AuthState
  user: AuthUser | null
}>

export const AuthContext = createContext<AuthContextValue | null>(null)

/** Returns the authentication API and current session state for UI components. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
