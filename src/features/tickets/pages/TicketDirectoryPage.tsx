import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/auth-context'
import type { Role } from '@/auth/auth-types'
import { TicketDirectoryFilters } from '@/features/tickets/components/TicketDirectoryFilters'
import { TicketDirectoryView } from '@/features/tickets/components/TicketDirectoryView'
import {
  createTicketDirectoryUrlConfig,
  getTicketLifecycleControlValue,
  toTicketDirectoryApiParams,
  type TicketDirectoryFilterKey,
  type TicketDirectorySortField,
} from '@/features/tickets/model/ticket-directory'
import { TICKET_DIRECTORY_ERROR_MESSAGES } from '@/features/tickets/model/ticket-error-messages'
import { createTicketDirectoryQueryOptions } from '@/features/tickets/queries/ticket-queries'
import { DataViewPagination } from '@/shared/data-view/DataViewPagination'
import { DataViewSearchField } from '@/shared/data-view/DataViewSearchField'
import type { DataViewSortOption } from '@/shared/data-view/DataViewSortControl'
import {
  getSingleFilterValue,
  useDataViewUrlState,
} from '@/shared/data-view/data-view-url-state'
import { createOfficeDirectoryQueryOptions } from '@/shared/offices/office-queries'
import {
  RemoteDataBoundary,
  RemoteDataEmptyState,
} from '@/shared/remote-data/RemoteDataBoundary'
import { PageHeader } from '@/shared/ui/PageHeader'

const SORT_OPTIONS: readonly DataViewSortOption<TicketDirectorySortField>[] = [
  { field: 'updatedAt', label: 'Änderungsdatum' },
  { field: 'createdAt', label: 'Erstellungsdatum' },
  { field: 'title', label: 'Titel' },
  { field: 'status', label: 'Öffentlicher Status' },
]

/** Routes authority users into their backend-scoped ticket workspace. */
export function TicketDirectoryPage() {
  const { user } = useAuth()
  const config = useMemo(() => createTicketDirectoryUrlConfig(), [])
  const directory = useDataViewUrlState<
    TicketDirectorySortField,
    TicketDirectoryFilterKey
  >(config)
  const params = toTicketDirectoryApiParams(directory.state)
  const ticketsQuery = useQuery(createTicketDirectoryQueryOptions(params))
  const officesQuery = useQuery(createOfficeDirectoryQueryOptions('active'))
  const offices = officesQuery.data ?? []
  const rawLifecycle = getSingleFilterValue(directory.state, 'lifecycle')

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        description={getDirectoryDescription(user?.role)}
        eyebrow="Ticket-Arbeitsbereich"
        title="Tickets"
      />

      <DataViewSearchField
        description="Durchsucht Titel und Beschreibung. Die Suche ist auf 200 Zeichen begrenzt."
        label="Tickets suchen"
        maxLength={200}
        onSearch={directory.setSearch}
        placeholder="Titel oder Beschreibung"
        value={directory.state.search}
      />

      <TicketDirectoryFilters
        category={getSingleFilterValue(directory.state, 'category')}
        createdFrom={getSingleFilterValue(directory.state, 'createdFrom')}
        createdTo={getSingleFilterValue(directory.state, 'createdTo')}
        isOfficeDirectoryLoading={officesQuery.isLoading}
        lifecycle={getTicketLifecycleControlValue(rawLifecycle)}
        office={getSingleFilterValue(directory.state, 'office')}
        officeDirectoryError={officesQuery.isError}
        offices={offices}
        onReset={directory.resetFilters}
        onSetCategory={(value) =>
          directory.setFilter('category', value || null)
        }
        onSetCreatedFrom={(value) =>
          directory.setFilter('createdFrom', value || null)
        }
        onSetCreatedTo={(value) =>
          directory.setFilter('createdTo', value || null)
        }
        onSetLifecycle={(value) =>
          directory.setFilter('lifecycle', value || null)
        }
        onSetOffice={(value) => directory.setFilter('office', value || null)}
        onSetSearch={directory.setSearch}
        onSetSort={directory.setSort}
        onSetStatus={(value) => directory.setFilter('status', value || null)}
        onSetUpdatedFrom={(value) =>
          directory.setFilter('updatedFrom', value || null)
        }
        onSetUpdatedTo={(value) =>
          directory.setFilter('updatedTo', value || null)
        }
        onSetWorkflowState={(value) =>
          directory.setFilter('workflowState', value || null)
        }
        search={directory.state.search}
        sort={directory.state.sort}
        sortOptions={SORT_OPTIONS}
        status={getSingleFilterValue(directory.state, 'status')}
        updatedFrom={getSingleFilterValue(directory.state, 'updatedFrom')}
        updatedTo={getSingleFilterValue(directory.state, 'updatedTo')}
        workflowState={getSingleFilterValue(
          directory.state,
          'workflowState',
        )}
      />

      <RemoteDataBoundary
        errorOptions={{
          fallback: {
            description:
              'Das Ticketverzeichnis konnte nicht geladen werden. Prüfe die Filter und versuche es erneut.',
            title: 'Tickets nicht verfügbar',
          },
          messagesByErrorCode: TICKET_DIRECTORY_ERROR_MESSAGES,
        }}
        empty={
          <RemoteDataEmptyState
            description={
              directory.hasActiveFilters
                ? 'Passe Suche oder Filter an, um weitere Tickets zu finden.'
                : 'Für deinen aktuellen Zuständigkeitsbereich sind keine aktiven Tickets vorhanden.'
            }
            title="Keine Tickets gefunden"
          />
        }
        isEmpty={(page) => page.items.length === 0}
        loadingLabel="Ticketverzeichnis wird geladen."
        query={ticketsQuery}
      >
        {(page) => (
          <div className="space-y-5">
            <TicketDirectoryView
              items={page.items}
              onSortChange={directory.setSort}
              sort={directory.state.sort}
            />
            <DataViewPagination
              label="Seiten des Ticketverzeichnisses"
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

function getDirectoryDescription(role: Role | undefined): string {
  if (role === 'DISPATCHER') {
    return 'Prüfe neue und zurückgegebene Anliegen, bevor sie einer zuständigen Behörde zugeordnet werden.'
  }
  if (role === 'MANAGER') {
    return 'Behalte die Tickets deiner Behörde sowie deine eigenen Bearbeitungs- und Entscheidungsaufgaben im Blick.'
  }
  return 'Finde die Tickets, an denen du als primärer oder aktueller Bearbeiter beteiligt bist.'
}
