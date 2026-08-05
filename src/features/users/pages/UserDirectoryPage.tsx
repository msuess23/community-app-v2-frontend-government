import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/auth-context'
import { getRoleLabel } from '@/auth/role-labels'
import type { AuthUser, Role } from '@/auth/auth-types'
import { UserDirectoryFilters } from '@/features/users/components/UserDirectoryFilters'
import { UserDirectoryView } from '@/features/users/components/UserDirectoryView'
import {
  createUserDirectoryUrlConfig,
  getUserDirectoryAccess,
  toUserDirectoryApiParams,
  type UserDirectoryFilterKey,
  type UserDirectorySortField,
} from '@/features/users/model/user-directory'
import { createUserDirectoryQueryOptions } from '@/features/users/queries/user-queries'
import { DataViewPagination } from '@/shared/data-view/DataViewPagination'
import { DataViewSearchField } from '@/shared/data-view/DataViewSearchField'
import type { DataViewSortOption } from '@/shared/data-view/DataViewSortControl'
import {
  getSingleFilterValue,
  useDataViewUrlState,
} from '@/shared/data-view/data-view-url-state'
import { createOfficeDirectoryQueryOptions } from '@/shared/offices/office-queries'
import { RemoteDataBoundary, RemoteDataEmptyState } from '@/shared/remote-data/RemoteDataBoundary'
import { PageHeader } from '@/shared/ui/PageHeader'

const SORT_OPTIONS: readonly DataViewSortOption<UserDirectorySortField>[] = [
  { field: 'lastName', label: 'Nachname' },
  { field: 'firstName', label: 'Vorname' },
  { field: 'email', label: 'E-Mail-Adresse' },
  { field: 'role', label: 'Rolle' },
  { field: 'createdAt', label: 'Erstellungsdatum' },
]

/** Routes authenticated authority users into the role-scoped directory implementation. */
export function UserDirectoryPage() {
  const { user } = useAuth()

  return user ? <AuthenticatedUserDirectoryPage user={user} /> : null
}

/** Owns query and URL state only while an authenticated user is available. */
function AuthenticatedUserDirectoryPage({
  user,
}: Readonly<{ user: AuthUser }>) {
  const access = useMemo(() => getUserDirectoryAccess(user.role), [user.role])
  const config = useMemo(() => createUserDirectoryUrlConfig(access), [access])
  const directory = useDataViewUrlState<
    UserDirectorySortField,
    UserDirectoryFilterKey
  >(config)
  const params = toUserDirectoryApiParams(directory.state, access)
  const usersQuery = useQuery(createUserDirectoryQueryOptions(params))
  const officesQuery = useQuery({
    ...createOfficeDirectoryQueryOptions(
      user.role === 'ADMIN' ? 'all' : 'active',
    ),
    enabled: access.canFilterByOffice,
  })
  const office = getSingleFilterValue(directory.state, 'office')
  const role = getSingleFilterValue(directory.state, 'role')
  const status = getSingleFilterValue(directory.state, 'status')
  const offices = officesQuery.data ?? []

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        description={getDirectoryDescription(user.role)}
        eyebrow="Benutzerverwaltung"
        title="Benutzer"
      />

      <DataViewSearchField
        description="Durchsucht E-Mail-Adresse, Vorname und Nachname."
        label="Benutzer suchen"
        onSearch={directory.setSearch}
        placeholder="Name oder E-Mail-Adresse"
        value={directory.state.search}
      />

      <UserDirectoryFilters
        access={access}
        isOfficeDirectoryLoading={officesQuery.isLoading}
        office={office}
        officeDirectoryError={officesQuery.isError}
        offices={offices}
        onReset={directory.resetFilters}
        onSetOffice={(value) => directory.setFilter('office', value || null)}
        onSetRole={(value) => directory.setFilter('role', value || null)}
        onSetSort={directory.setSort}
        onSetStatus={(value) => directory.setFilter('status', value || null)}
        onSetSearch={directory.setSearch}
        role={role}
        search={directory.state.search}
        sort={directory.state.sort}
        sortOptions={SORT_OPTIONS}
        status={status}
      />

      <RemoteDataBoundary
        empty={
          <RemoteDataEmptyState
            description={
              directory.hasActiveFilters
                ? 'Passe Suche oder Filter an, um weitere Konten zu finden.'
                : 'Für deinen aktuellen Sichtbarkeitsbereich sind keine Benutzerkonten vorhanden.'
            }
            title="Keine Benutzer gefunden"
          />
        }
        errorOptions={{
          messagesByErrorCode: {
            LIFECYCLE_FILTER_NOT_ALLOWED: {
              description:
                'Deine Rolle darf deaktivierte Konten nicht durchsuchen.',
              title: 'Statusfilter nicht erlaubt',
            },
            OFFICE_FILTER_OUTSIDE_SCOPE: {
              description:
                'Die ausgewählte Behörde liegt außerhalb deines Zuständigkeitsbereichs.',
              title: 'Behördenfilter nicht erlaubt',
            },
            ROLE_FILTER_NOT_ALLOWED: {
              description:
                'Deine Rolle darf Bürgerkonten nicht durchsuchen.',
              title: 'Rollenfilter nicht erlaubt',
            },
          },
        }}
        isEmpty={(page) => page.items.length === 0}
        loadingLabel="Benutzerverzeichnis wird geladen."
        query={usersQuery}
      >
        {(page) => (
          <div className="space-y-5">
            <UserDirectoryView
              items={page.items}
              offices={offices}
              onSortChange={directory.setSort}
              sort={directory.state.sort}
            />

            <DataViewPagination
              label="Seiten des Benutzerverzeichnisses"
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

/** Explains the effective visibility scope without exposing backend terminology. */
function getDirectoryDescription(role: Role): string {
  if (role === 'ADMIN') {
    return 'Finde aktive und deaktivierte Konten, einschließlich neu registrierter Bürgerkonten, die für den Behördenzugang freigeschaltet werden sollen.'
  }

  if (role === 'DISPATCHER') {
    return 'Finde aktive Behördenmitarbeitende über alle Behörden hinweg.'
  }

  return `Finde aktive Mitarbeitende deiner Behörde. Dein Zugriff richtet sich nach der Rolle ${getRoleLabel(role)}.`
}
