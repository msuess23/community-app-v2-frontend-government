export function SessionLoadingPage() {
  return (
    <div
      aria-live="polite"
      className="mx-auto flex min-h-64 max-w-md flex-col items-center justify-center gap-4 text-center"
      role="status"
    >
      <span
        aria-hidden="true"
        className="border-primary-container border-t-primary size-10 animate-spin rounded-full border-4"
      />
      <div>
        <p className="text-on-surface font-semibold">Sitzung wird geprüft</p>
        <p className="text-on-surface-variant mt-1 text-sm">
          Bitte einen Moment warten.
        </p>
      </div>
    </div>
  )
}
