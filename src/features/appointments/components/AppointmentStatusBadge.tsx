import {
  getAppointmentStatusLabel,
  type AppointmentStatus,
} from '@/features/appointments/model/appointment-model'
import {
  DataViewStatusBadge,
  type DataViewStatusTone,
} from '@/shared/data-view/DataViewStatusBadge'

/** Presents the complete appointment lifecycle as text and a supporting visual tone. */
export function AppointmentStatusBadge({
  status,
}: Readonly<{ status: AppointmentStatus }>) {
  return (
    <DataViewStatusBadge tone={getAppointmentStatusTone(status)}>
      <span className="sr-only">Terminstatus: </span>
      <span>{getAppointmentStatusLabel(status)}</span>
    </DataViewStatusBadge>
  )
}

function getAppointmentStatusTone(
  status: AppointmentStatus,
): DataViewStatusTone {
  if (status === 'COMPLETED') {
    return 'success'
  }
  if (status === 'CANCELLED') {
    return 'danger'
  }
  if (status === 'NO_SHOW') {
    return 'warning'
  }
  return 'info'
}
