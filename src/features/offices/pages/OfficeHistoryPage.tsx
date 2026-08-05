import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useParams } from 'react-router'

import { OfficeHistoryFilters } from '@/features/offices/components/OfficeHistoryFilters'
import { OfficeHistoryView } from '@/features/offices/components/OfficeHistoryView'
import {
  createOfficeHistoryUrlConfig,
  getOfficeHistoryDateRange,
  toOfficeHistoryApiParams,
  type OfficeHistoryFilterKey,
  type OfficeHistorySortField,
} from '@/features/offices/model/office-history'
import {
  createOfficeDetailQueryOptions,
  createOfficeHistoryQueryOptions,
} from '@/features/offices/queries/office-queries'
import { DataViewPagination } from '@/shared/data-view/DataViewPagination'
import { useDataViewUrlState } from '@/shared/data-view/data-view-url-state'
import {
  RemoteDataBoundary,
  RemoteDataEmptyState,
} from '@/shared/remote-data/RemoteDataBoundary'
import { resolveResourceDetailReturnTo } from '@/shared/resource-detail/detail-navigation'
import { ResourceDetailLayout } from '@/shared/resource-detail/ResourceDetailLayout'
import { Card } from '@/shared/ui/Card'

/** Displays the administrator-only append-only snapshot history of one office. */
export function OfficeHistoryPage() {
  const { officeId = '' } = useParams()
  const location = useLocation()
  const config = useMemo(() => createOfficeHistoryUrlConfig(), [])
  const history = useDataViewUrlState<
    OfficeHistorySortField,
    OfficeHistoryFilterKey
  >(config)
  const dateRange = getOfficeHistoryDateRange(history.state)
  const params = toOfficeHistoryApiParams(history.state)
  const officeQuery = useQuery({
    ...createOfficeDetailQueryOptions(officeId),
    enabled: officeId.length > 0,
  })
  const historyQuery = useQuery({
    ...createOfficeHistoryQueryOptions(officeId, params),
    enabled: officeId.length > 0 && !dateRange.isInvalid,
  })
  const listReturnTo = resolveResourceDetailReturnTo(
    getListReturnState(location.state),
    '/offices',
  )

  return (
    <RemoteDataBoundary
      errorOptions={{
        messagesByErrorCode: {
          OFFICE_NOT_FOUND: {
            description:
              'Die Behörde wurde nicht gefunden oder ist nicht mehr verfügbar.',
            title: 'Behördenhistorie nicht verfügbar',
          },
        },
        fallback: {
          description:
            'Die Behörde konnte für die Historie nicht geladen werden.',
          title: 'Behördenhistorie nicht verfügbar',
        },
      }}
      loadingLabel="Behörde wird für die Historie geladen."
      query={officeQuery}
    >
      {(office) => (
        <ResourceDetailLayout
          backLink={{
            label: 'Zurück zu den Behördendetails',
            state: { from: listReturnTo },
            to: `/offices/${office.id}`,
          }}
          description="Jeder Eintrag zeigt den dauerhaft gespeicherten Behördenstand nach einer administrativen Änderung. Historische Adressen werden direkt aus dem jeweiligen Snapshot angezeigt."
          eyebrow="Behördenhistorie"
          title={office.name}
        >
          <OfficeHistoryFilters
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
                      : 'Für diese Behörde sind noch keine Historieneinträge vorhanden.'
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
                  OFFICE_NOT_FOUND: {
                    description:
                      'Die Behörde wurde nicht gefunden oder ist nicht mehr verfügbar.',
                    title: 'Behördenhistorie nicht verfügbar',
                  },
                },
              }}
              isEmpty={(page) => page.items.length === 0}
              loadingLabel="Behördenhistorie wird geladen."
              query={historyQuery}
            >
              {(page) => (
                <div className="space-y-5">
                  <OfficeHistoryView items={page.items} />
                  <DataViewPagination
                    label="Seiten der Behördenhistorie"
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

/** Recovers the original directory target from the state passed by the detail page. */
function getListReturnState(state: unknown): unknown {
  if (!state || typeof state !== 'object') {
    return undefined
  }

  const listFrom = Reflect.get(state, 'listFrom')
  return typeof listFrom === 'string' ? { from: listFrom } : undefined
}
