import { useState } from 'react'

import { ApiError } from '@/api/client/api-error'
import {
  RemoteDataBoundary,
  RemoteDataEmptyState,
} from '@/shared/remote-data/RemoteDataBoundary'
import { Button } from '@/shared/ui/Button'

type ExampleMode = 'data' | 'empty' | 'error' | 'loading' | 'stale-error'

const exampleItems = [
  { id: 'ticket-1', title: 'Defekte Straßenbeleuchtung' },
  { id: 'ticket-2', title: 'Beschädigtes Verkehrsschild' },
]

/** Demonstrates the reusable query lifecycle states without calling a backend. */
export function RemoteDataLifecycleExample() {
  const [mode, setMode] = useState<ExampleMode>('data')
  const hasStaleData = mode === 'data' || mode === 'stale-error'
  const query = {
    data: hasStaleData ? exampleItems : mode === 'empty' ? [] : undefined,
    error:
      mode === 'error' || mode === 'stale-error'
        ? new ApiError({ message: 'Technical example details', status: 503 })
        : null,
    isError: mode === 'error' || mode === 'stale-error',
    isFetching: mode === 'loading',
    isLoading: mode === 'loading',
    refetch: (() => {
      setMode('data')
    }) as never,
  }

  return (
    <div className="space-y-5">
      <div
        aria-label="Datenzustand auswählen"
        className="flex flex-wrap gap-2"
        role="group"
      >
        <Button onPress={() => setMode('loading')} size="sm" variant="outline">
          Laden
        </Button>
        <Button onPress={() => setMode('data')} size="sm" variant="outline">
          Daten
        </Button>
        <Button onPress={() => setMode('empty')} size="sm" variant="outline">
          Leer
        </Button>
        <Button onPress={() => setMode('error')} size="sm" variant="outline">
          Fehler
        </Button>
        <Button
          onPress={() => setMode('stale-error')}
          size="sm"
          variant="outline"
        >
          Refetch-Fehler
        </Button>
      </div>

      <RemoteDataBoundary
        empty={
          <RemoteDataEmptyState
            description="Ändere die Filter oder lege später einen neuen Eintrag an."
            title="Keine Beispielanliegen"
          />
        }
        isEmpty={(items) => items.length === 0}
        query={query}
      >
        {(items) => (
          <ul className="divide-outline-variant border-outline-variant divide-y rounded-lg border">
            {items.map((item) => (
              <li className="p-4" key={item.id}>
                {item.title}
              </li>
            ))}
          </ul>
        )}
      </RemoteDataBoundary>
    </div>
  )
}
