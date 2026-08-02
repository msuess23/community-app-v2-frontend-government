/** Displays an accessible fallback while an asynchronously loaded route becomes available. */
export function RouteLoadingPage() {
  return (
    <main
      aria-live="polite"
      className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
      id="main-content"
      role="status"
      tabIndex={-1}
    >
      <span
        aria-hidden="true"
        className="border-primary-container border-t-primary size-10 animate-spin rounded-full border-4"
      />
      <div>
        <p className="text-on-surface font-semibold">Anwendung wird geladen</p>
        <p className="text-on-surface-variant mt-1 text-sm">
          Bitte einen Moment warten.
        </p>
      </div>
    </main>
  )
}
