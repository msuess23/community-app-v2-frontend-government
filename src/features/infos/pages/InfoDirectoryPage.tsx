import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'

import { useAuth } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { InfoDirectoryFilters } from '@/features/infos/components/InfoDirectoryFilters'
import { InfoDirectoryView } from '@/features/infos/components/InfoDirectoryView'
import { canCreateInfo } from '@/features/infos/model/info-permissions'
import {
  createInfoDirectoryUrlConfig,
  toInfoDirectoryApiParams,
  type InfoDirectoryFilterKey,
  type InfoDirectorySortField,
} from '@/features/infos/model/info-directory'
import { createInfoDirectoryQueryOptions } from '@/features/infos/queries/info-queries'
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
import { LinkButton } from '@/shared/ui/LinkButton'
import { PageHeader } from '@/shared/ui/PageHeader'

const SORT_OPTIONS: readonly DataViewSortOption<InfoDirectorySortField>[] = [
  { field: 'startsAt', label: 'Beginn' },
  { field: 'endsAt', label: 'Ende' },
  { field: 'createdAt', label: 'Erstellungsdatum' },
  { field: 'updatedAt', label: 'Änderungsdatum' },
  { field: 'title', label: 'Titel' },
]

/** Routes authority users into the complete non-geographic Info directory. */
export function InfoDirectoryPage() {
  const { user } = useAuth()
  return user ? <AuthenticatedInfoDirectoryPage user={user} /> : null
}

function AuthenticatedInfoDirectoryPage({ user }: Readonly<{ user: AuthUser }>) {
  const location = useLocation()
  const config = useMemo(() => createInfoDirectoryUrlConfig(), [])
  const directory = useDataViewUrlState<
    InfoDirectorySortField,
    InfoDirectoryFilterKey
  >(config)
  const params = toInfoDirectoryApiParams(directory.state)
  const infosQuery = useQuery(createInfoDirectoryQueryOptions(params))
  const officesQuery = useQuery(
    createOfficeDirectoryQueryOptions(user.role === 'ADMIN' ? 'all' : 'active'),
  )
  const offices = officesQuery.data ?? []

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        actions={
          canCreateInfo(user) ? (
            <LinkButton
              state={{ from: `${location.pathname}${location.search}` }}
              to="/infos/new"
            >
              <Plus aria-hidden="true" size={18} />
              Mitteilung anlegen
            </LinkButton>
          ) : undefined
        }
        description="Finde behördliche Mitteilungen zu Veranstaltungen, Baumaßnahmen, Wartungen und weiteren aktuellen Themen."
        eyebrow="Mitteilungsverzeichnis"
        title="Mitteilungen"
      />

      <DataViewSearchField
        description="Durchsucht Titel und Beschreibung. Mehrere Suchwörter können kombiniert werden."
        label="Mitteilungen suchen"
        onSearch={directory.setSearch}
        placeholder="Titel oder Beschreibung"
        value={directory.state.search}
      />

      <InfoDirectoryFilters
        category={getSingleFilterValue(directory.state, 'category')}
        endsTo={getSingleFilterValue(directory.state, 'endsTo')}
        isOfficeDirectoryLoading={officesQuery.isLoading}
        office={getSingleFilterValue(directory.state, 'office')}
        officeDirectoryError={officesQuery.isError}
        offices={offices}
        onReset={directory.resetFilters}
        onSetCategory={(value) => directory.setFilter('category', value || null)}
        onSetEndsTo={(value) => directory.setFilter('endsTo', value || null)}
        onSetOffice={(value) => directory.setFilter('office', value || null)}
        onSetSearch={directory.setSearch}
        onSetSort={directory.setSort}
        onSetStartsFrom={(value) =>
          directory.setFilter('startsFrom', value || null)
        }
        onSetStatus={(value) => directory.setFilter('status', value || null)}
        search={directory.state.search}
        sort={directory.state.sort}
        sortOptions={SORT_OPTIONS}
        startsFrom={getSingleFilterValue(directory.state, 'startsFrom')}
        status={getSingleFilterValue(directory.state, 'status')}
      />

      <RemoteDataBoundary
        empty={
          <RemoteDataEmptyState
            description={
              directory.hasActiveFilters
                ? 'Passe Suche oder Filter an, um weitere Mitteilungen zu finden.'
                : 'Derzeit sind keine Mitteilungen vorhanden.'
            }
            title="Keine Mitteilungen gefunden"
          />
        }
        isEmpty={(page) => page.items.length === 0}
        loadingLabel="Mitteilungsverzeichnis wird geladen."
        query={infosQuery}
      >
        {(page) => (
          <div className="space-y-5">
            <InfoDirectoryView items={page.items} offices={offices} />
            <DataViewPagination
              label="Seiten des Mitteilungsverzeichnisses"
              onPageChange={directory.setPage}
              onPageSizeChange={directory.setPageSize}
              page={page.page}
              pageSize={page.pageSize}
              pageSizeOptions={config.pageSizeOptions}
              total={page.totalItems}
            />
          </div>
        )}
      </RemoteDataBoundary>
    </div>
  )
}
