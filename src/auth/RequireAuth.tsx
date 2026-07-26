import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '@/auth/auth-context'
import { createLoginPath } from '@/auth/auth-redirect'
import { SessionLoadingPage } from '@/pages/SessionLoadingPage'

export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'initializing') {
    return <SessionLoadingPage />
  }

  if (state.status === 'anonymous') {
    return <Navigate replace to={createLoginPath(location)} />
  }

  return <Outlet />
}
