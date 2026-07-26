import { createBrowserRouter, type RouteObject } from 'react-router'

import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'
import { UiKitPage } from '@/pages/UiKitPage'
import { RootLayout } from '@/shared/layout/RootLayout'

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        index: true,
        Component: HomePage,
      },
      {
        path: 'ui-kit',
        Component: UiKitPage,
      },
      {
        path: '*',
        Component: NotFoundPage,
      },
    ],
  },
]

export const router = createBrowserRouter(appRoutes)
