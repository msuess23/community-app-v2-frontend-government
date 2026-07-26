import { createElement, type ReactElement } from 'react'
import { createMemoryRouter, type RouteObject } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { render } from '@testing-library/react'
import type { QueryClient } from '@tanstack/react-query'

import { AppProviders } from '@/app/AppProviders'
import { createQueryClient } from '@/app/query-client'
import type { AuthSession } from '@/auth/auth-session'

type ProviderOptions = Readonly<{
  authSession?: AuthSession
  queryClient?: QueryClient
}>

export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions = {},
) {
  return render(
    createElement(AppProviders, {
      authSession: options.authSession,
      children: ui,
      queryClient: options.queryClient ?? createQueryClient(),
    }),
  )
}

export function renderRouter(
  routes: RouteObject[],
  initialEntries: string[] = ['/'],
  options: ProviderOptions = {},
) {
  const router = createMemoryRouter(routes, { initialEntries })
  const application = createElement(AppProviders, {
    authSession: options.authSession,
    children: createElement(RouterProvider, { router }),
    queryClient: options.queryClient ?? createQueryClient(),
  })

  return {
    router,
    ...render(application),
  }
}
