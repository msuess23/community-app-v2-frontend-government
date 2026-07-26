import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { queryClient as defaultQueryClient } from '@/app/query-client'

type AppProvidersProps = {
  children: ReactNode
  queryClient?: QueryClient
}

export function AppProviders({
  children,
  queryClient = defaultQueryClient,
}: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
