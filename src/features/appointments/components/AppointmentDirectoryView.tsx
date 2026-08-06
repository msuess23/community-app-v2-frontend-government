import { ExternalLink } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { AppointmentStatusBadge } from '@/features/appointments/components/AppointmentStatusBadge'
import type { AppointmentDirectorySortField } from '@/features/appointments/model/appointment-directory'
import {
  getAppointmentAccessibleLabel,
  getAppointmentDurationLabel,
  type AppointmentRecord,
} from '@/features/appointments/model/appointment-model'
import {
  ResponsiveDataView,
  type DataViewColumn,
} from '@/shared/data-view/ResponsiveDataView'
import type { DataViewSort } from '@/shared/data-view/data-view-url-state'
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatDisplayTime,
} from '@/shared/format/display-values'
import { createResourceDetailNavigationState } from '@/shared/resource-detail/detail-navigation'
import { LinkButton } from '@/shared/ui/LinkButton'

export interface AppointmentDirectoryViewProps {
  items: readonly AppointmentRecord[]
  onSortChange: (
    sort: DataViewSort<AppointmentDirectorySortField>,
  ) => void
  sort: DataViewSort<AppointmentDirectorySortField> | null
}

/** Presents appointments as a desktop table and equivalent compact cards. */
export function AppointmentDirectoryView({
  items,
  onSortChange,
  sort,
}: AppointmentDirectoryViewProps) {
  const location = useLocation()
  const navigationState = createResourceDetailNavigationState(location)

  return (
    <ResponsiveDataView
      caption="Terminverzeichnis"
      columns={createAppointmentColumns({
        navigationState,
        onSortChange,
        sort,
      })}
      compactListClassName="sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0"
      getItemLabel={getAppointmentAccessibleLabel}
      getRowKey={(appointment) => appointment.id}
      items={items}
      tableBreakpoint="lg"
    />
  )
}

type CreateAppointmentColumnsInput = Readonly<{
  navigationState: ReturnType<typeof createResourceDetailNavigationState>
  onSortChange: (
    sort: DataViewSort<AppointmentDirectorySortField>,
  ) => void
  sort: DataViewSort<AppointmentDirectorySortField> | null
}>

function createAppointmentColumns({
  navigationState,
  onSortChange,
  sort,
}: CreateAppointmentColumnsInput): readonly DataViewColumn<AppointmentRecord>[] {
  return [
    {
      header: 'Termin',
      id: 'startsAt',
      isRowHeader: true,
      render: (appointment) => (
        <Link
          className="text-primary focus-visible:outline-primary rounded-sm underline decoration-2 underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          state={navigationState}
          to={`/appointments/${appointment.id}`}
        >
          <span className="block">
            {formatDisplayDate(appointment.startsAt)}
          </span>
          <span className="text-on-surface-variant block font-normal">
            {formatDisplayTime(appointment.startsAt)}–
            {formatDisplayTime(appointment.endsAt)} Uhr
          </span>
        </Link>
      ),
      sort: createColumnSort('startsAt', 'Terminbeginn', sort, onSortChange),
    },
    {
      header: 'Bürger',
      id: 'citizen',
      render: (appointment) => appointment.citizen.displayName,
    },
    {
      header: 'Status',
      id: 'status',
      render: (appointment) => (
        <AppointmentStatusBadge status={appointment.status} />
      ),
      sort: createColumnSort('status', 'Status', sort, onSortChange),
    },
    {
      header: 'Dauer',
      id: 'duration',
      render: getAppointmentDurationLabel,
    },
    {
      header: 'Anliegen',
      id: 'reason',
      render: (appointment) => appointment.reason ?? 'Kein Anliegen hinterlegt',
    },
    {
      header: 'Ticket',
      id: 'ticket',
      render: (appointment) => appointment.ticket?.title ?? 'Nicht verknüpft',
    },
    {
      header: 'Zuletzt geändert',
      id: 'updatedAt',
      mobileLabel: 'Geändert',
      render: (appointment) => (
        <time dateTime={appointment.updatedAt}>
          {formatDisplayDateTime(appointment.updatedAt)}
        </time>
      ),
    },
    {
      align: 'end',
      header: 'Aktionen',
      id: 'actions',
      isAction: true,
      render: (appointment) => (
        <LinkButton
          aria-label={`${getAppointmentAccessibleLabel(appointment)} öffnen`}
          size="sm"
          state={navigationState}
          to={`/appointments/${appointment.id}`}
          variant="outline"
        >
          Details
          <ExternalLink aria-hidden="true" size={16} />
        </LinkButton>
      ),
    },
  ]
}

function createColumnSort(
  field: AppointmentDirectorySortField,
  sortLabel: string,
  sort: DataViewSort<AppointmentDirectorySortField> | null,
  onSortChange: (
    sort: DataViewSort<AppointmentDirectorySortField>,
  ) => void,
) {
  return {
    direction: sort?.field === field ? sort.direction : null,
    onChange: (direction: 'asc' | 'desc') =>
      onSortChange({ direction, field }),
    sortLabel,
  }
}
