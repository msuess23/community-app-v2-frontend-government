import { useQueryClient } from '@tanstack/react-query'
import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import {
  createAuthSession,
  type AuthSession,
} from '@/auth/auth-session'

export type AuthProviderProps = Readonly<{
  children: ReactNode
  session?: AuthSession
}>

export function AuthProvider({ children, session }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const defaultSession = useMemo(
    () => createAuthSession({ queryClient }),
    [queryClient],
  )
  const activeSession = session ?? defaultSession
  const state = useSyncExternalStore(
    activeSession.subscribe,
    activeSession.getSnapshot,
    activeSession.getSnapshot,
  )

  useEffect(() => {
    const stop = activeSession.start()
    void activeSession.initialize().catch(() => undefined)

    return stop
  }, [activeSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: state.status === 'authenticated',
      isInitializing: state.status === 'initializing',
      login: (input) => activeSession.login(input),
      logout: () => activeSession.logout(),
      logoutAll: () => activeSession.logoutAll(),
      register: (input) => activeSession.register(input),
      state,
      user: state.user,
    }),
    [activeSession, state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
