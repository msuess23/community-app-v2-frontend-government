import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { OfficeDirectoryFilters } from '@/features/offices/components/OfficeDirectoryFilters'
import { OfficeDirectoryView } from '@/features/offices/components/OfficeDirectoryView'
import {
  createOfficeDirectoryUrlConfig,
  getOfficeDirectoryAccess,
  toOfficeDirectoryApiParams,
  type OfficeDirectoryFilterKey,
  type OfficeDirectorySortField,
} from '@/features/offices/model/office-directory'
import { createOfficeFeatureDirectoryQueryOptions } from '@/features/offices/queries/office-queries'
import { DataViewPagination } from '@/shared/data-view/DataViewPagination'
import { DataViewSearchField } from '@/shared/data-view/DataViewSearchField'
import {
  DataViewSortControl,
  type DataViewSortOption,
} from '@/shared/data-view/DataViewSortControl'
import {
  getSingleFilterValue,
  useDataViewUrlState,
} from '@/shared/data-view/data-view-url-state'
import {
  RemoteDataBoundary,
  RemoteDataEmptyState,
} from '@/shared/remote-data/RemoteDataBoundary'
import { PageHeader } from '@/shared/ui/PageHeader'

const SORT_OPTIONS: readonly DataViewSortOption<OfficeDirectorySortField>[] = [
  { field: 'name', label: 'Name' },
  { field: 'contactEmail', label: 'Kontakt-E-Mail-Adresse' },
  { field: 'createdAt', label: 'Erstellungsdatum' },
]

/** Routes authenticated authority users into the role-scoped office directory. */
export function OfficeDirectoryPage() {
  const { user } = useAuth()

  return user ? <AuthenticatedOfficeDirectoryPage user={user} /> : null
}

/** Owns query and URL state only while an authenticated user is available. */
function AuthenticatedOfficeDirectoryPage({
  user,
}: Readonly<{ user: AuthUser }>) {
  const access = useMemo(() => getOfficeDirectoryAccess(user.role), [user.role])
  const config = useMemo(
    () => createOfficeDirectoryUrlConfig(access),
    [access],
  )
  const directory = useDataViewUrlState<
    OfficeDirectorySortField,
    OfficeDirectoryFilterKey
  >(config)
  const params = toOfficeDirectoryApiParams(directory.state, access)
  const officesQuery = useQuery(
    createOfficeFeatureDirectoryQueryOptions(params),
  )
  const status = getSingleFilterValue(directory.state, 'status')

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        description={
          access.canFilterByStatus
            ? 'Finde aktive und deaktivierte Behörden und öffne ihre vollständigen Stammdaten.'
            : 'Finde aktive Behörden mit Kontaktdaten, Leistungen und Öffnungszeiten.'
        }
        eyebrow="Behördenverzeichnis"
        title="Behörden"
      />

      <DataViewSearchField
        description="Durchsucht Name, Beschreibung und Kontakt-E-Mail-Adresse."
        label="Behörden suchen"
        onSearch={directory.setSearch}
        placeholder="Name, Beschreibung oder E-Mail-Adresse"
        value={directory.state.search}
      />

      <OfficeDirectoryFilters
        access={access}
        onReset={directory.resetFilters}
        onSetSearch={directory.setSearch}
        onSetStatus={(value) => directory.setFilter('status', value || null)}
        search={directory.state.search}
        status={status}
      />

      <RemoteDataBoundary
        empty={
          <RemoteDataEmptyState
            description={
              directory.hasActiveFilters
                ? 'Passe Suche oder Filter an, um weitere Behörden zu finden.'
                : 'Für den aktuellen Sichtbarkeitsbereich sind keine Behörden vorhanden.'
            }
            title="Keine Behörden gefunden"
          />
        }
        errorOptions={{
          messagesByErrorCode: {
            LIFECYCLE_FILTER_NOT_ALLOWED: {
              description:
                'Deine Rolle darf deaktivierte Behörden nicht durchsuchen.',
              title: 'Statusfilter nicht erlaubt',
            },
          },
        }}
        isEmpty={(page) => page.items.length === 0}
        loadingLabel="Behördenverzeichnis wird geladen."
        query={officesQuery}
      >
        {(page) => (
          <div className="space-y-5">
            <div className="lg:hidden">
              <DataViewSortControl
                onChange={directory.setSort}
                options={SORT_OPTIONS}
                value={directory.state.sort}
              />
            </div>

            <OfficeDirectoryView
              items={page.items}
              onSortChange={directory.setSort}
              sort={directory.state.sort}
            />

            <DataViewPagination
              label="Seiten des Behördenverzeichnisses"
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
