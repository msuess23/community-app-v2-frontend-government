export function HomePage() {
  return (
    <section aria-labelledby="home-heading" className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold tracking-wide text-blue-700 uppercase">
          Community-App
        </p>
        <h1
          id="home-heading"
          className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
        >
          Behördenclient
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          Das technische Fundament der Anwendung ist eingerichtet. Fachliche
          Bereiche und die Authentifizierung werden in getrennten Patches
          ergänzt.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Aktueller Stand
        </h2>
        <p className="mt-2 leading-7 text-slate-600">
          Routing, zentrale Provider, Fehlerbehandlung und die responsive
          Grundstruktur stehen für die nächsten Implementierungsschritte
          bereit.
        </p>
      </div>
    </section>
  )
}
