import { Link, Outlet } from 'react-router'

export function RootLayout() {
  return (
    <div className="bg-surface-container-low text-on-surface min-h-screen">
      <a
        className="bg-on-surface text-surface focus:outline-primary fixed top-3 left-3 z-50 -translate-y-24 rounded-md px-4 py-2 font-semibold transition focus:translate-y-0 focus:outline-2 focus:outline-offset-2"
        href="#main-content"
      >
        Zum Hauptinhalt springen
      </a>

      <header className="border-outline-variant bg-surface-container-lowest border-b">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            className="text-primary focus-visible:outline-primary rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4"
            to="/"
          >
            Community-App · Behördenclient
          </Link>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8"
        id="main-content"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  )
}
