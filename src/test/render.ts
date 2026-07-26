import { createElement, type ReactElement } from 'react'
import { createMemoryRouter, type RouteObject } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { render } from '@testing-library/react'

import { AppProviders } from '@/app/AppProviders'
import { createQueryClient } from '@/app/query-client'

export function renderWithProviders(ui: ReactElement) {
  return render(
    createElement(AppProviders, { queryClient: createQueryClient() }, ui),
  )
}

export function renderRouter(
  routes: RouteObject[],
  initialEntries: string[] = ['/'],
) {
  const router = createMemoryRouter(routes, { initialEntries })
  const application = createElement(
    AppProviders,
    { queryClient: createQueryClient() },
    createElement(RouterProvider, { router }),
  )

  return {
    router,
    ...render(application),
  }
}
