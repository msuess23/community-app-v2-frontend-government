import { isRouteErrorResponse, useRouteError } from 'react-router'

import { LinkButton } from '@/shared/ui/LinkButton'
import { PageHeader } from '@/shared/ui/PageHeader'

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
        <PageHeader
          description={
            <p>
              Beim Verarbeiten der Anfrage ist ein unerwarteter Fehler
              aufgetreten. Versuche es erneut oder kehre zur Startseite zurück.
            </p>
          }
          eyebrow={<span className="text-error">Anwendungsfehler</span>}
          headingId="route-error-heading"
          title="Die Seite konnte nicht geladen werden"
        />

        {import.meta.env.DEV ? (
          <pre className="bg-on-surface text-surface mt-6 overflow-auto rounded-lg p-4 text-sm">
            {getErrorMessage(error)}
          </pre>
        ) : null}

        <LinkButton className="mt-6" to="/">
          Zur Startseite
        </LinkButton>
      </section>
    </main>
  )
}
