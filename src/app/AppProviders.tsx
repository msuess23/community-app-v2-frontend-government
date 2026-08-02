import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { queryClient as defaultQueryClient } from '@/app/query-client'
import { AuthProvider } from '@/auth/AuthProvider'
import type { AuthSession } from '@/auth/auth-session'
import { ConfirmationProvider } from '@/shared/confirmation/ConfirmationProvider'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'

type AppProvidersProps = {
  authSession?: AuthSession
  children: ReactNode
  queryClient?: QueryClient
}

/** Composes the application-wide data, feedback, confirmation and auth services. */
export function AppProviders({
  authSession,
  children,
  queryClient = defaultQueryClient,
}: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <ConfirmationProvider>
          <AuthProvider session={authSession}>{children}</AuthProvider>
        </ConfirmationProvider>
      </FeedbackProvider>
    </QueryClientProvider>
  )
}
