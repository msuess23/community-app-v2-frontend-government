import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading" className="max-w-2xl">
      <p className="text-sm font-semibold text-blue-700">Fehler 404</p>
      <h1
        id="not-found-heading"
        className="mt-2 text-3xl font-bold tracking-tight text-slate-950"
      >
        Seite nicht gefunden
      </h1>
      <p className="mt-4 leading-7 text-slate-600">
        Die aufgerufene Adresse existiert nicht oder wurde verschoben.
      </p>
      <Link
        className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        to="/"
      >
        Zur Startseite
      </Link>
    </section>
  )
}
