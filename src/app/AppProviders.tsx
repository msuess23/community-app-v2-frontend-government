import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { queryClient as defaultQueryClient } from '@/app/query-client'
import { AuthProvider } from '@/auth/AuthProvider'
import type { AuthSession } from '@/auth/auth-session'

type AppProvidersProps = {
  authSession?: AuthSession
  children: ReactNode
  queryClient?: QueryClient
}

export function AppProviders({
  authSession,
  children,
  queryClient = defaultQueryClient,
}: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider session={authSession}>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
