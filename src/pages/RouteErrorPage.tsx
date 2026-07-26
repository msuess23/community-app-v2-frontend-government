import { Link, isRouteErrorResponse, useRouteError } from 'react-router'

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `HTTP ${error.status}: ${error.statusText || 'Unbekannter Fehler'}`
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unbekannter Fehler'
}

export function RouteErrorPage() {
  const error = useRouteError()

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <section aria-labelledby="route-error-heading">
        <p className="text-sm font-semibold text-red-700">Anwendungsfehler</p>
        <h1
          id="route-error-heading"
          className="mt-2 text-3xl font-bold tracking-tight text-slate-950"
        >
          Die Seite konnte nicht geladen werden
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          Beim Verarbeiten der Anfrage ist ein unerwarteter Fehler aufgetreten.
          Versuche es erneut oder kehre zur Startseite zurück.
        </p>

        {import.meta.env.DEV ? (
          <pre className="mt-6 overflow-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-100">
            {getErrorMessage(error)}
          </pre>
        ) : null}

        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          to="/"
        >
          Zur Startseite
        </Link>
      </section>
    </main>
  )
}
