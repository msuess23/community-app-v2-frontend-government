import type { AppointmentSlotDirectorySortField } from '@/features/appointments/model/appointment-slot-directory'
import {
  getAppointmentSlotDurationLabel,
  type AppointmentSlotRecord,
} from '@/features/appointments/model/appointment-slot-model'
import { AppointmentSlotDeactivationButton } from '@/features/appointments/components/AppointmentSlotDeactivationButton'
import { AppointmentSlotStatusBadge } from '@/features/appointments/components/AppointmentSlotStatusBadge'
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

export interface AppointmentSlotDirectoryViewProps {
  items: readonly AppointmentSlotRecord[]
  onSortChange: (
    sort: DataViewSort<AppointmentSlotDirectorySortField>,
  ) => void
  sort: DataViewSort<AppointmentSlotDirectorySortField> | null
}

/** Presents slots as a desktop table and equivalent mobile/tablet cards. */
export function AppointmentSlotDirectoryView({
  items,
  onSortChange,
  sort,
}: AppointmentSlotDirectoryViewProps) {
  return (
    <ResponsiveDataView
      caption="Terminslotverzeichnis"
      columns={createAppointmentSlotColumns({ onSortChange, sort })}
      compactListClassName="sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0"
      getItemLabel={(slot) =>
        `Terminslot am ${formatDisplayDateTime(slot.startsAt)} Uhr`
      }
      getRowKey={(slot) => slot.id}
      items={items}
      tableBreakpoint="lg"
    />
  )
}

type CreateAppointmentSlotColumnsInput = Readonly<{
  onSortChange: (
    sort: DataViewSort<AppointmentSlotDirectorySortField>,
  ) => void
  sort: DataViewSort<AppointmentSlotDirectorySortField> | null
}>

function createAppointmentSlotColumns({
  onSortChange,
  sort,
}: CreateAppointmentSlotColumnsInput): readonly DataViewColumn<AppointmentSlotRecord>[] {
  return [
    {
      header: 'Beginn',
      id: 'startsAt',
      isRowHeader: true,
      render: (slot) => (
        <time dateTime={slot.startsAt}>
          <span className="block">{formatDisplayDate(slot.startsAt)}</span>
          <span className="text-on-surface-variant block font-normal">
            {formatDisplayTime(slot.startsAt)} Uhr
          </span>
        </time>
      ),
      sort: createColumnSort('startsAt', 'Beginn', sort, onSortChange),
    },
    {
      header: 'Ende',
      id: 'endsAt',
      render: (slot) => (
        <time dateTime={slot.endsAt}>
          {formatDisplayDateTime(slot.endsAt)} Uhr
        </time>
      ),
    },
    {
      header: 'Dauer',
      id: 'duration',
      render: getAppointmentSlotDurationLabel,
    },
    {
      header: 'Status',
      id: 'status',
      render: (slot) => <AppointmentSlotStatusBadge slot={slot} />,
      sort: createColumnSort('status', 'Status', sort, onSortChange),
    },
    {
      header: 'Erstellt',
      id: 'createdAt',
      render: (slot) => (
        <time dateTime={slot.createdAt}>
          {formatDisplayDateTime(slot.createdAt)} Uhr
        </time>
      ),
      sort: createColumnSort('createdAt', 'Erstellungsdatum', sort, onSortChange),
    },
    {
      align: 'end',
      header: 'Aktionen',
      id: 'actions',
      isAction: true,
      render: (slot) => <AppointmentSlotDeactivationButton slot={slot} />,
    },
  ]
}

function createColumnSort(
  field: AppointmentSlotDirectorySortField,
  sortLabel: string,
  sort: DataViewSort<AppointmentSlotDirectorySortField> | null,
  onSortChange: (
    sort: DataViewSort<AppointmentSlotDirectorySortField>,
  ) => void,
) {
  return {
    direction: sort?.field === field ? sort.direction : null,
    onChange: (direction: 'asc' | 'desc') =>
      onSortChange({ direction, field }),
    sortLabel,
  }
}
