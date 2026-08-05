import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useParams } from 'react-router'

import { UserHistoryFilters } from '@/features/users/components/UserHistoryFilters'
import { UserHistoryView } from '@/features/users/components/UserHistoryView'
import {
  createUserHistoryUrlConfig,
  getUserHistoryDateRange,
  toUserHistoryApiParams,
  type UserHistoryFilterKey,
  type UserHistorySortField,
} from '@/features/users/model/user-history'
import { getUserDisplayName } from '@/features/users/model/user-model'
import {
  createUserDetailQueryOptions,
  createUserHistoryQueryOptions,
} from '@/features/users/queries/user-queries'
import { DataViewPagination } from '@/shared/data-view/DataViewPagination'
import { useDataViewUrlState } from '@/shared/data-view/data-view-url-state'
import {
  RemoteDataBoundary,
  RemoteDataEmptyState,
} from '@/shared/remote-data/RemoteDataBoundary'
import { resolveResourceDetailReturnTo } from '@/shared/resource-detail/detail-navigation'
import { ResourceDetailLayout } from '@/shared/resource-detail/ResourceDetailLayout'
import { Card } from '@/shared/ui/Card'

/** Displays the administrator-only append-only snapshot history of one account. */
export function UserHistoryPage() {
  const { userId = '' } = useParams()
  const location = useLocation()
  const config = useMemo(() => createUserHistoryUrlConfig(), [])
  const history = useDataViewUrlState<
    UserHistorySortField,
    UserHistoryFilterKey
  >(config)
  const dateRange = getUserHistoryDateRange(history.state)
  const params = toUserHistoryApiParams(history.state)
  const userQuery = useQuery({
    ...createUserDetailQueryOptions(userId),
    enabled: userId.length > 0,
  })
  const historyQuery = useQuery({
    ...createUserHistoryQueryOptions(userId, params),
    enabled: userId.length > 0 && !dateRange.isInvalid,
  })
  const listReturnTo = resolveResourceDetailReturnTo(
    getListReturnState(location.state),
    '/users',
  )

  return (
    <RemoteDataBoundary
      errorOptions={{
        fallback: {
          description:
            'Das Benutzerkonto konnte für die Historie nicht geladen werden.',
          title: 'Benutzerhistorie nicht verfügbar',
        },
      }}
      loadingLabel="Benutzerkonto wird für die Historie geladen."
      query={userQuery}
    >
      {(user) => (
        <ResourceDetailLayout
          backLink={{
            label: 'Zurück zum Benutzerprofil',
            state: { from: listReturnTo },
            to: `/users/${user.id}`,
          }}
          description="Jeder Eintrag zeigt den dauerhaft gespeicherten Kontostand nach einer administrativen Änderung."
          eyebrow="Benutzerhistorie"
          title={getUserDisplayName(user)}
        >
          <UserHistoryFilters
            endDate={dateRange.endDate}
            onReset={history.resetFilters}
            onSetEndDate={(value) =>
              history.setFilter('endDate', value || null)
            }
            onSetStartDate={(value) =>
              history.setFilter('startDate', value || null)
            }
            startDate={dateRange.startDate}
          />

          {dateRange.isInvalid ? (
            <Card role="alert" variant="outlined">
              <h2 className="text-error text-lg font-semibold">
                Zeitraum überprüfen
              </h2>
              <p className="text-on-surface-variant mt-2 leading-7">
                Das Startdatum darf nicht nach dem Enddatum liegen. Passe den
                Zeitraum an, um die Historie zu laden.
              </p>
            </Card>
          ) : (
            <RemoteDataBoundary
              empty={
                <RemoteDataEmptyState
                  description={
                    history.hasActiveFilters
                      ? 'Für den gewählten Zeitraum sind keine Änderungen gespeichert.'
                      : 'Für dieses Benutzerkonto sind noch keine Historieneinträge vorhanden.'
                  }
                  title="Keine Änderungen gefunden"
                />
              }
              errorOptions={{
                messagesByErrorCode: {
                  INVALID_DATE_RANGE: {
                    description:
                      'Das Startdatum darf nicht nach dem Enddatum liegen.',
                    title: 'Zeitraum überprüfen',
                  },
                },
              }}
              isEmpty={(page) => page.items.length === 0}
              loadingLabel="Benutzerhistorie wird geladen."
              query={historyQuery}
            >
              {(page) => (
                <div className="space-y-5">
                  <UserHistoryView items={page.items} />
                  <DataViewPagination
                    label="Seiten der Benutzerhistorie"
                    onPageChange={history.setPage}
                    onPageSizeChange={history.setPageSize}
                    page={page.page}
                    pageSize={history.state.pageSize}
                    pageSizeOptions={config.pageSizeOptions}
                    total={page.totalItems}
                  />
                </div>
              )}
            </RemoteDataBoundary>
          )}
        </ResourceDetailLayout>
      )}
    </RemoteDataBoundary>
  )
}

/** Recovers the original list target from the state passed by the detail page. */
function getListReturnState(state: unknown): unknown {
  if (!state || typeof state !== 'object') {
    return undefined
  }

  const listFrom = Reflect.get(state, 'listFrom')
  return typeof listFrom === 'string' ? { from: listFrom } : undefined
}
