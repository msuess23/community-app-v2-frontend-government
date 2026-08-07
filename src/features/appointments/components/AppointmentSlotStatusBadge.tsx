import {
  getAppointmentSlotEffectiveStatus,
  getAppointmentSlotStatusLabel,
  type AppointmentSlotRecord,
} from '@/features/appointments/model/appointment-slot-model'
import {
  DataViewStatusBadge,
  type DataViewStatusTone,
} from '@/shared/data-view/DataViewStatusBadge'

/** Presents the effective slot state as text and a supporting visual tone. */
export function AppointmentSlotStatusBadge({
  slot,
}: Readonly<{ slot: AppointmentSlotRecord }>) {
  const status = getAppointmentSlotEffectiveStatus(slot)

  return (
    <DataViewStatusBadge tone={getAppointmentSlotStatusTone(status)}>
      <span className="sr-only">Slotstatus: </span>
      <span>{getAppointmentSlotStatusLabel(status)}</span>
    </DataViewStatusBadge>
  )
}

function getAppointmentSlotStatusTone(
  status: ReturnType<typeof getAppointmentSlotEffectiveStatus>,
): DataViewStatusTone {
  if (status === 'AVAILABLE') {
    return 'success'
  }
  if (status === 'BOOKED') {
    return 'info'
  }
  if (status === 'EXPIRED' || status === 'CONSUMED') {
    return 'warning'
  }
  return 'neutral'
}
