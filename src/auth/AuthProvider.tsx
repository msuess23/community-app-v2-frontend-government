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
import {
  useFeedback,
  type FeedbackInput,
} from '@/shared/feedback/feedback-context'

export type AuthProviderProps = Readonly<{
  children: ReactNode
  session?: AuthSession
}>

/** Exposes the active authentication session to the React application tree. */
export function AuthProvider({ children, session }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const { clear: clearFeedback, notify } = useFeedback()
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
  // Status is tracked separately because rejected restoration has no user ID transition.
  const previousSessionRef = useRef({
    status: state.status,
    userId: currentUserId,
  })

  useEffect(() => {
    const previousSession = previousSessionRef.current
    previousSessionRef.current = {
      status: state.status,
      userId: currentUserId,
    }

    const userChanged = previousSession.userId !== currentUserId
    const sessionEnded =
      state.status === 'anonymous' && previousSession.status !== 'anonymous'

    if (!userChanged && !sessionEnded) {
      return
    }

    // Feedback from one account must not remain visible after a session boundary.
    clearFeedback()

    if (state.status === 'anonymous') {
      const endFeedback = getSessionEndFeedback(
        activeSession.consumeEndReason(),
      )

      if (endFeedback) {
        notify(endFeedback)
      }
    }
  }, [activeSession, clearFeedback, currentUserId, notify, state.status])

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
      updateCurrentUser: (input) => activeSession.updateCurrentUser(input),
      user: state.user,
    }),
    [activeSession, state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Translates session termination reasons into persistent global feedback. */
function getSessionEndFeedback(
  reason: ReturnType<AuthSession['consumeEndReason']>,
): FeedbackInput | null {
  switch (reason) {
    case 'refresh-rejected':
      return {
        dedupeKey: 'session-expired',
        description:
          'Deine Sitzung ist nicht mehr gültig. Melde dich erneut an, um fortzufahren.',
        title: 'Sitzung abgelaufen',
        tone: 'warning' as const,
      }
    case 'logout-all-complete':
      return {
        dedupeKey: 'all-sessions-ended',
        description: 'Alle aktiven Sitzungen dieses Kontos wurden beendet.',
        title: 'Sitzungen beendet',
        tone: 'success' as const,
      }
    case 'logout-all-local-only':
      return {
        dedupeKey: 'local-session-ended',
        description:
          'Diese Sitzung wurde beendet. Andere Sitzungen konnten wegen eines Serverfehlers möglicherweise nicht abgemeldet werden.',
        title: 'Nur lokale Sitzung sicher beendet',
        tone: 'warning' as const,
      }
    case null:
      return null
  }
}
