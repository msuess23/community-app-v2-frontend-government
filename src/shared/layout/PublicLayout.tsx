import { Link, Outlet } from 'react-router'

/**
 * Frames authentication and access-status pages without the authority navigation.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-outline-variant bg-surface-container-lowest border-b">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
          <Link
            className="text-primary focus-visible:outline-primary rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4"
            to="/"
          >
            Community-App · Behördenclient
          </Link>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-12 lg:px-8"
        id="main-content"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  )
}
