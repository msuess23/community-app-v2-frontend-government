import { useQueryClient } from '@tanstack/react-query'
import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import {
  createAuthSession,
  type AuthSession,
} from '@/auth/auth-session'
import { useFeedback } from '@/shared/feedback/feedback-context'

export type AuthProviderProps = Readonly<{
  children: ReactNode
  session?: AuthSession
}>

/** Exposes the active authentication session to the React application tree. */
export function AuthProvider({ children, session }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const { clear: clearFeedback } = useFeedback()
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

  const currentUserId = state.status === 'authenticated' ? state.user.id : null
  const previousUserIdRef = useRef<string | null>(currentUserId)

  useEffect(() => {
    if (previousUserIdRef.current === currentUserId) {
      return
    }

    // Feedback from one account must not remain visible after a session boundary.
    clearFeedback()
    previousUserIdRef.current = currentUserId
  }, [clearFeedback, currentUserId])

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
      refreshCurrentUser: () => activeSession.refreshCurrentUser(),
      register: (input) => activeSession.register(input),
      state,
      user: state.user,
    }),
    [activeSession, state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
