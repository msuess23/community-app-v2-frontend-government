import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { AppointmentDirectoryFilters } from '@/features/appointments/components/AppointmentDirectoryFilters'
import { AppointmentDirectoryView } from '@/features/appointments/components/AppointmentDirectoryView'
import { AppointmentWorkspaceNavigation } from '@/features/appointments/components/AppointmentWorkspaceNavigation'
import {
  createAppointmentDirectoryUrlConfig,
  toAppointmentDirectoryApiParams,
  type AppointmentDirectoryFilterKey,
  type AppointmentDirectorySortField,
} from '@/features/appointments/model/appointment-directory'
import { APPOINTMENT_DIRECTORY_ERROR_MESSAGES } from '@/features/appointments/model/appointment-error-messages'
import {
  createAppointmentDirectoryQueryOptions,
  createAppointmentFilterOptionsQueryOptions,
} from '@/features/appointments/queries/appointment-queries'
import { DataViewPagination } from '@/shared/data-view/DataViewPagination'
import { DataViewSearchField } from '@/shared/data-view/DataViewSearchField'
import type { DataViewSortOption } from '@/shared/data-view/DataViewSortControl'
import {
  getSingleFilterValue,
  useDataViewUrlState,
} from '@/shared/data-view/data-view-url-state'
import {
  RemoteDataBoundary,
  RemoteDataEmptyState,
} from '@/shared/remote-data/RemoteDataBoundary'
import { PageHeader } from '@/shared/ui/PageHeader'

const SORT_OPTIONS: readonly DataViewSortOption<AppointmentDirectorySortField>[] = [
  { field: 'startsAt', label: 'Terminbeginn' },
  { field: 'createdAt', label: 'Erstellungsdatum' },
  { field: 'status', label: 'Status' },
]

/** Renders the office-scoped appointment workspace for Officer and Manager roles. */
export function AppointmentDirectoryPage() {
  const config = useMemo(() => createAppointmentDirectoryUrlConfig(), [])
  const directory = useDataViewUrlState<
    AppointmentDirectorySortField,
    AppointmentDirectoryFilterKey
  >(config)
  const appointmentsQuery = useQuery(
    createAppointmentDirectoryQueryOptions(
      toAppointmentDirectoryApiParams(directory.state),
    ),
  )
  const filterOptionsQuery = useQuery(
    createAppointmentFilterOptionsQueryOptions(),
  )
  const filterOptions = filterOptionsQuery.data ?? {
    citizens: [],
    tickets: [],
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        description="Finde die Termine deiner Behörde, prüfe den aktuellen Planungsstand und öffne die vollständige Terminprojektion."
        eyebrow="Terminverwaltung"
        title="Termine"
      />

      <AppointmentWorkspaceNavigation />

      <DataViewSearchField
        description="Durchsucht Bürgername, E-Mail-Adresse, Anliegen und den Titel eines verknüpften Tickets. Die Suche ist auf 200 Zeichen begrenzt."
        label="Termine suchen"
        maxLength={200}
        onSearch={directory.setSearch}
        placeholder="Bürger, Anliegen oder Ticket"
        value={directory.state.search}
      />

      <AppointmentDirectoryFilters
        citizen={getSingleFilterValue(directory.state, 'citizen')}
        citizens={filterOptions.citizens}
        createdFrom={getSingleFilterValue(directory.state, 'createdFrom')}
        createdTo={getSingleFilterValue(directory.state, 'createdTo')}
        filterOptionsError={filterOptionsQuery.isError}
        isFilterOptionsLoading={filterOptionsQuery.isLoading}
        onReset={directory.resetFilters}
        onSetCitizen={(value) =>
          directory.setFilter('citizen', value || null)
        }
        onSetCreatedFrom={(value) =>
          directory.setFilter('createdFrom', value || null)
        }
        onSetCreatedTo={(value) =>
          directory.setFilter('createdTo', value || null)
        }
        onSetSearch={directory.setSearch}
        onSetSort={directory.setSort}
        onSetStartsFrom={(value) =>
          directory.setFilter('startsFrom', value || null)
        }
        onSetStartsTo={(value) =>
          directory.setFilter('startsTo', value || null)
        }
        onSetStatus={(value) =>
          directory.setFilter('status', value || null)
        }
        onSetTicket={(value) =>
          directory.setFilter('ticket', value || null)
        }
        search={directory.state.search}
        sort={directory.state.sort}
        sortOptions={SORT_OPTIONS}
        startsFrom={getSingleFilterValue(directory.state, 'startsFrom')}
        startsTo={getSingleFilterValue(directory.state, 'startsTo')}
        status={getSingleFilterValue(directory.state, 'status')}
        ticket={getSingleFilterValue(directory.state, 'ticket')}
        tickets={filterOptions.tickets}
      />

      <RemoteDataBoundary
        empty={
          <RemoteDataEmptyState
            description={
              directory.hasActiveFilters
                ? 'Passe Suche oder Filter an, um weitere Termine zu finden.'
                : 'Für deine Behörde sind derzeit keine Termine vorhanden.'
            }
            title="Keine Termine gefunden"
          />
        }
        errorOptions={{
          fallback: {
            description:
              'Das Terminverzeichnis konnte nicht geladen werden. Prüfe die Filter und versuche es erneut.',
            title: 'Termine nicht verfügbar',
          },
          messagesByErrorCode: APPOINTMENT_DIRECTORY_ERROR_MESSAGES,
        }}
        isEmpty={(page) => page.items.length === 0}
        loadingLabel="Terminverzeichnis wird geladen."
        query={appointmentsQuery}
      >
        {(page) => (
          <div className="space-y-5">
            <AppointmentDirectoryView
              items={page.items}
              onSortChange={directory.setSort}
              sort={directory.state.sort}
            />
            <DataViewPagination
              label="Seiten des Terminverzeichnisses"
              onPageChange={directory.setPage}
              onPageSizeChange={directory.setPageSize}
              page={page.page}
              pageSize={directory.state.pageSize}
              pageSizeOptions={config.pageSizeOptions}
              total={page.totalItems}
            />
          </div>
        )}
      </RemoteDataBoundary>
    </div>
  )
}
