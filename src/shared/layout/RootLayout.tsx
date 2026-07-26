import { Link, Outlet } from 'react-router'

export function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <a
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-md bg-slate-950 px-4 py-2 font-semibold text-white transition focus:translate-y-0 focus:outline-none"
        href="#main-content"
      >
        Zum Hauptinhalt springen
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            className="rounded-md font-semibold tracking-tight text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
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
