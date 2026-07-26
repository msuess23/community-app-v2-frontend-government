import { createElement } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'

import { RequireAuth } from '@/auth/RequireAuth'
import { RequireRole } from '@/auth/RequireRole'
import { AUTHORITY_ROLES } from '@/auth/auth-types'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'
import { UiKitPage } from '@/pages/UiKitPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { RootLayout } from '@/shared/layout/RootLayout'

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        path: 'login',
        Component: LoginPage,
      },
      {
        path: 'register',
        Component: RegisterPage,
      },
      {
        path: 'forbidden',
        Component: ForbiddenPage,
      },
      {
        path: 'ui-kit',
        Component: UiKitPage,
      },
      {
        Component: RequireAuth,
        children: [
          {
            element: createElement(RequireRole, { roles: AUTHORITY_ROLES }),
            children: [
              {
                index: true,
                Component: HomePage,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        Component: NotFoundPage,
      },
    ],
  },
]

export const router = createBrowserRouter(appRoutes)
