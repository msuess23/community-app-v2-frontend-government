import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'

import {
  getApiErrorPresentation,
  type ApiErrorPresentationOptions,
} from '@/api/client/api-error-presentation'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'

type RemoteQuerySnapshot<TData, TError> = Pick<
  UseQueryResult<TData, TError>,
  'data' | 'error' | 'isError' | 'isFetching' | 'isLoading' | 'refetch'
>

export type RemoteDataBoundaryProps<TData, TError = unknown> = Readonly<{
  children: (data: TData) => ReactNode
  empty?: ReactNode
  errorOptions?: ApiErrorPresentationOptions
  idle?: ReactNode
  isEmpty?: (data: TData) => boolean
  loadingLabel?: string
  query: RemoteQuerySnapshot<TData, TError>
}>

/** Renders consistent initial, empty, stale-error and refresh states for a query. */
export function RemoteDataBoundary<TData, TError = unknown>({
  children,
  empty,
  errorOptions,
  idle = null,
  isEmpty = () => false,
  loadingLabel = 'Daten werden geladen.',
  query,
}: RemoteDataBoundaryProps<TData, TError>) {
  const hasData = query.data !== undefined

  if (!hasData && query.isLoading) {
    return <RemoteDataLoadingState label={loadingLabel} />
  }

  if (!hasData && query.isError) {
    return (
      <RemoteDataErrorState
        error={query.error}
        errorOptions={errorOptions}
        onRetry={() => void query.refetch()}
      />
    )
  }

  if (!hasData) {
    return idle
  }

  const data = query.data as TData

  return (
    <div className="space-y-4">
      {query.isError ? (
        <RemoteDataRefreshError
          error={query.error}
          errorOptions={errorOptions}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isFetching ? (
        <p
          aria-live="polite"
          className="text-on-surface-variant text-sm"
          role="status"
        >
          Daten werden aktualisiert.
        </p>
      ) : null}

      {isEmpty(data) ? (empty ?? <RemoteDataEmptyState />) : children(data)}
    </div>
  )
}

/** Shows an accessible loading state without replacing already rendered data. */
export function RemoteDataLoadingState({ label }: Readonly<{ label: string }>) {
  return (
    <div
      aria-live="polite"
      className="flex min-h-32 items-center justify-center gap-3"
      role="status"
    >
      <span
        aria-hidden="true"
        className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-r-transparent motion-reduce:animate-none"
      />
      <span>{label}</span>
    </div>
  )
}

/** Provides the default neutral state for a successful query without results. */
export function RemoteDataEmptyState({
  description = 'Für die aktuelle Auswahl sind keine Einträge vorhanden.',
  title = 'Keine Daten vorhanden',
}: Readonly<{ description?: string; title?: string }>) {
  return (
    <Card className="text-center" variant="subtle">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-on-surface-variant mt-2">{description}</p>
    </Card>
  )
}

/** Presents a blocking query failure with a keyboard-accessible retry action. */
export function RemoteDataErrorState({
  error,
  errorOptions,
  onRetry,
}: Readonly<{
  error: unknown
  errorOptions?: ApiErrorPresentationOptions
  onRetry: () => void
}>) {
  const message = getApiErrorPresentation(error, errorOptions)

  return (
    <Card className="border-error" role="alert" variant="outlined">
      <h2 className="text-error text-lg font-semibold">{message.title}</h2>
      <p className="text-on-surface-variant mt-2">{message.description}</p>
      <div className="mt-5">
        <Button onPress={onRetry} variant="secondary">
          Erneut versuchen
        </Button>
      </div>
    </Card>
  )
}

/** Keeps stale data visible while explaining that its background refresh failed. */
function RemoteDataRefreshError({
  error,
  errorOptions,
  onRetry,
}: Readonly<{
  error: unknown
  errorOptions?: ApiErrorPresentationOptions
  onRetry: () => void
}>) {
  const message = getApiErrorPresentation(error, errorOptions)

  return (
    <div
      className="border-error bg-error-container text-on-error-container flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <div>
        <p className="font-semibold">Aktualisierung fehlgeschlagen</p>
        <p className="mt-1 text-sm">{message.description}</p>
      </div>
      <Button onPress={onRetry} size="sm" variant="secondary">
        Neu laden
      </Button>
    </div>
  )
}
