import { createElement } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'

import { RequireAuth } from '@/auth/RequireAuth'
import { RequireCapability } from '@/auth/RequireCapability'
import { AccessPendingPage } from '@/pages/AccessPendingPage'
import { AccountPage } from '@/pages/AccountPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { AppShellLayout } from '@/shared/layout/AppShellLayout'
import { PublicLayout } from '@/shared/layout/PublicLayout'
import { RootLayout } from '@/shared/layout/RootLayout'

// The UI kit remains a development blueprint and is excluded from production routing.
const developmentRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        handle: { pageTitle: 'UI-Bausteine' },
        lazy: async () => {
          const { UiKitPage } = await import('@/pages/UiKitPage')
          return { Component: UiKitPage }
        },
        path: 'ui-kit',
      },
    ]
  : []

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        Component: PublicLayout,
        children: [
          {
            path: 'login',
            Component: LoginPage,
            handle: { pageTitle: 'Anmelden' },
          },
          {
            path: 'register',
            Component: RegisterPage,
            handle: { pageTitle: 'Bürgerkonto erstellen' },
          },
          {
            path: 'password-forgotten',
            Component: ForgotPasswordPage,
            handle: { pageTitle: 'Passwort vergessen' },
          },
          {
            path: 'password-reset',
            Component: ResetPasswordPage,
            handle: { pageTitle: 'Passwort zurücksetzen' },
          },
          ...developmentRoutes,
        ],
      },
      {
        Component: RequireAuth,
        children: [
          {
            Component: PublicLayout,
            children: [
              {
                path: 'access-pending',
                Component: AccessPendingPage,
                handle: { pageTitle: 'Zugang noch nicht freigeschaltet' },
              },
            ],
          },
          {
            element: createElement(RequireCapability, {
              capability: 'accessAuthorityClient',
              fallbackPath: '/access-pending',
            }),
            children: [
              {
                Component: AppShellLayout,
                children: [
                  {
                    index: true,
                    Component: HomePage,
                    handle: { pageTitle: 'Übersicht' },
                  },
                  {
                    path: 'account',
                    Component: AccountPage,
                    handle: { pageTitle: 'Mein Konto' },
                  },
                  {
                    path: 'forbidden',
                    Component: ForbiddenPage,
                    handle: { pageTitle: 'Zugriff nicht erlaubt' },
                  },
                  {
                    path: '*',
                    Component: NotFoundPage,
                    handle: { pageTitle: 'Seite nicht gefunden' },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(appRoutes)
