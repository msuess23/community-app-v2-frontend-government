import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/auth-context'
import { AppointmentSlotDirectoryFilters } from '@/features/appointments/components/AppointmentSlotDirectoryFilters'
import { AppointmentSlotDirectoryView } from '@/features/appointments/components/AppointmentSlotDirectoryView'
import { AppointmentWorkspaceNavigation } from '@/features/appointments/components/AppointmentWorkspaceNavigation'
import {
  createAppointmentSlotDirectoryUrlConfig,
  toAppointmentSlotDirectoryApiParams,
  type AppointmentSlotDirectoryFilterKey,
  type AppointmentSlotDirectorySortField,
} from '@/features/appointments/model/appointment-slot-directory'
import { APPOINTMENT_SLOT_DIRECTORY_ERROR_MESSAGES } from '@/features/appointments/model/appointment-error-messages'
import { createAppointmentSlotDirectoryQueryOptions } from '@/features/appointments/queries/appointment-slot-queries'
import { DataViewPagination } from '@/shared/data-view/DataViewPagination'
import type { DataViewSortOption } from '@/shared/data-view/DataViewSortControl'
import {
  getSingleFilterValue,
  useDataViewUrlState,
} from '@/shared/data-view/data-view-url-state'
import {
  RemoteDataBoundary,
  RemoteDataEmptyState,
} from '@/shared/remote-data/RemoteDataBoundary'
import { Card } from '@/shared/ui/Card'
import { LinkButton } from '@/shared/ui/LinkButton'
import { PageHeader } from '@/shared/ui/PageHeader'

const SORT_OPTIONS: readonly DataViewSortOption<AppointmentSlotDirectorySortField>[] = [
  { field: 'startsAt', label: 'Beginn' },
  { field: 'createdAt', label: 'Erstellungsdatum' },
  { field: 'status', label: 'Status' },
]

/** Renders all capacity slots of the current Officer or Manager office. */
export function AppointmentSlotDirectoryPage() {
  const { user } = useAuth()
  const config = useMemo(() => createAppointmentSlotDirectoryUrlConfig(), [])
  const directory = useDataViewUrlState<
    AppointmentSlotDirectorySortField,
    AppointmentSlotDirectoryFilterKey
  >(config)
  const officeId = user?.officeId ?? ''
  const slotsQuery = useQuery({
    ...createAppointmentSlotDirectoryQueryOptions(
      officeId,
      toAppointmentSlotDirectoryApiParams(directory.state),
    ),
    enabled: officeId.length > 0,
  })

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        actions={
          officeId ? (
            <LinkButton to="/appointments/slots/new">
              <Plus aria-hidden="true" size={18} />
              Terminslots anlegen
            </LinkButton>
          ) : undefined
        }
        description="Verwalte die buchbare Terminkapazität deiner Behörde. Vergangene freie Slots werden als verstrichen dargestellt und bleiben nachvollziehbar erhalten."
        eyebrow="Terminverwaltung"
        title="Terminslots"
      />

      <AppointmentWorkspaceNavigation />

      {!officeId ? (
        <Card padding="md" variant="subtle">
          <h2 className="text-lg font-semibold">Keine Behörde zugeordnet</h2>
          <p className="text-on-surface-variant mt-2 leading-7">
            Für die Slotverwaltung muss dein Benutzerkonto einer Behörde
            zugeordnet sein.
          </p>
        </Card>
      ) : (
        <>
          <AppointmentSlotDirectoryFilters
            onReset={directory.resetFilters}
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
            sort={directory.state.sort}
            sortOptions={SORT_OPTIONS}
            startsFrom={getSingleFilterValue(directory.state, 'startsFrom')}
            startsTo={getSingleFilterValue(directory.state, 'startsTo')}
            status={getSingleFilterValue(directory.state, 'status')}
          />

          <RemoteDataBoundary
            empty={
              <RemoteDataEmptyState
                description={
                  directory.hasActiveFilters
                    ? 'Passe die Filter an, um weitere Terminslots zu finden.'
                    : 'Für deine Behörde wurden noch keine Terminslots angelegt.'
                }
                title="Keine Terminslots gefunden"
              />
            }
            errorOptions={{
              fallback: {
                description:
                  'Die Terminslots konnten nicht geladen werden. Prüfe die Filter und versuche es erneut.',
                title: 'Terminslots nicht verfügbar',
              },
              messagesByErrorCode: APPOINTMENT_SLOT_DIRECTORY_ERROR_MESSAGES,
            }}
            isEmpty={(page) => page.items.length === 0}
            loadingLabel="Terminslots werden geladen."
            query={slotsQuery}
          >
            {(page) => (
              <div className="space-y-5">
                <AppointmentSlotDirectoryView
                  items={page.items}
                  onSortChange={directory.setSort}
                  sort={directory.state.sort}
                />
                <DataViewPagination
                  label="Seiten des Terminslotverzeichnisses"
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
        </>
      )}
    </div>
  )
}
