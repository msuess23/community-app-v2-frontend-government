import { Outlet } from 'react-router'

import { useRouteLifecycle } from '@/app/route-lifecycle'

/**
 * Provides route-level accessibility behavior shared by public and private pages.
 */
export function RootLayout() {
  useRouteLifecycle()

  return (
    <div className="bg-surface-container-low text-on-surface min-h-screen">
      <a
        className="bg-on-surface text-surface focus:outline-primary fixed top-3 left-3 z-50 -translate-y-24 rounded-md px-4 py-2 font-semibold transition focus:translate-y-0 focus:outline-2 focus:outline-offset-2"
        href="#main-content"
      >
        Zum Hauptinhalt springen
      </a>

      <Outlet />
    </div>
  )
}
