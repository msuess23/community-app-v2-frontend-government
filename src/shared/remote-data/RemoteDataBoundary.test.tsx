import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import {
  RemoteDataBoundary,
  RemoteDataEmptyState,
} from '@/shared/remote-data/RemoteDataBoundary'
import { renderWithProviders } from '@/test/render'

describe('RemoteDataBoundary', () => {
  it('announces the initial loading state', () => {
    renderWithProviders(
      <RemoteDataBoundary
        query={createQuerySnapshot({ isFetching: true, isLoading: true })}
      >
        {() => <p>Geladene Daten</p>}
      </RemoteDataBoundary>,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Daten werden geladen.',
    )
    expect(screen.queryByText('Geladene Daten')).not.toBeInTheDocument()
  })

  it('supports an explicit idle state for dependent queries', () => {
    renderWithProviders(
      <RemoteDataBoundary
        idle={<p>Wähle zunächst eine Behörde aus.</p>}
        query={createQuerySnapshot({})}
      >
        {() => <p>Geladene Daten</p>}
      </RemoteDataBoundary>,
    )

    expect(
      screen.getByText('Wähle zunächst eine Behörde aus.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Daten werden geladen.')).not.toBeInTheDocument()
  })

  it('shows a safe blocking error and retries on request', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()

    renderWithProviders(
      <RemoteDataBoundary
        query={createQuerySnapshot({
          error: new ApiError({ message: 'Internal details', status: 503 }),
          isError: true,
          refetch,
        })}
      >
        {() => <p>Geladene Daten</p>}
      </RemoteDataBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Serverfehler')
    expect(screen.queryByText('Internal details')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }))

    expect(refetch).toHaveBeenCalledOnce()
  })

  it('keeps stale data visible when a background refresh fails', () => {
    renderWithProviders(
      <RemoteDataBoundary
        query={createQuerySnapshot({
          data: ['Anliegen 1'],
          error: new ApiError({ message: 'Conflict', status: 409 }),
          isError: true,
        })}
      >
        {(items) => <p>{items.join(', ')}</p>}
      </RemoteDataBoundary>,
    )

    expect(screen.getByText('Anliegen 1')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Aktualisierung fehlgeschlagen',
    )
  })

  it('renders a supplied empty state after a successful query', () => {
    renderWithProviders(
      <RemoteDataBoundary
        empty={
          <RemoteDataEmptyState
            description="Passe die Filter an."
            title="Keine passenden Anliegen"
          />
        }
        isEmpty={(items) => items.length === 0}
        query={createQuerySnapshot({ data: [] as string[] })}
      >
        {(items) => <p>{items.join(', ')}</p>}
      </RemoteDataBoundary>,
    )

    expect(
      screen.getByRole('heading', { name: 'Keine passenden Anliegen' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Passe die Filter an.')).toBeInTheDocument()
  })

  it('announces background refreshes without replacing current content', () => {
    renderWithProviders(
      <RemoteDataBoundary
        query={createQuerySnapshot({
          data: { title: 'Anliegen 1' },
          isFetching: true,
        })}
      >
        {(item) => <p>{item.title}</p>}
      </RemoteDataBoundary>,
    )

    expect(screen.getByText('Anliegen 1')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Daten werden aktualisiert.',
    )
  })
})

type QuerySnapshotOverrides<TData> = Readonly<{
  data?: TData
  error?: unknown
  isError?: boolean
  isFetching?: boolean
  isLoading?: boolean
  refetch?: ReturnType<typeof vi.fn>
}>

function createQuerySnapshot<TData>({
  data,
  error = null,
  isError = false,
  isFetching = false,
  isLoading = false,
  refetch = vi.fn(),
}: QuerySnapshotOverrides<TData>) {
  return {
    data,
    error,
    isError,
    isFetching,
    isLoading,
    refetch: refetch as never,
  }
}
