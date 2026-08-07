import type { AppointmentSlotStatus } from '@/api/generated/models'

export type { AppointmentSlotStatus } from '@/api/generated/models'

export const APPOINTMENT_SLOT_STATUSES = [
  'AVAILABLE',
  'BOOKED',
  'INACTIVE',
  'CONSUMED',
] as const satisfies readonly AppointmentSlotStatus[]

export type AppointmentSlotEffectiveStatus =
  | AppointmentSlotStatus
  | 'EXPIRED'

/** Current server-owned appointment-slot projection used by the authority client. */
export type AppointmentSlotRecord = Readonly<{
  createdAt: string
  endsAt: string
  id: string
  officeId: string
  startsAt: string
  status: AppointmentSlotStatus
}>

const STATUS_LABELS: Readonly<Record<AppointmentSlotEffectiveStatus, string>> = {
  AVAILABLE: 'Verfügbar',
  BOOKED: 'Gebucht',
  CONSUMED: 'Verbraucht',
  EXPIRED: 'Verstrichen',
  INACTIVE: 'Deaktiviert',
}

/** Derives the display status without pretending that expired capacity is bookable. */
export function getAppointmentSlotEffectiveStatus(
  slot: Pick<AppointmentSlotRecord, 'startsAt' | 'status'>,
  now = new Date(),
): AppointmentSlotEffectiveStatus {
  if (
    slot.status === 'AVAILABLE' &&
    Number.isFinite(Date.parse(slot.startsAt)) &&
    Date.parse(slot.startsAt) <= now.getTime()
  ) {
    return 'EXPIRED'
  }

  return slot.status
}

/** Localizes one persisted or derived slot status. */
export function getAppointmentSlotStatusLabel(
  status: AppointmentSlotEffectiveStatus,
): string {
  return STATUS_LABELS[status]
}

/** Returns whether a slot may currently be deactivated by authority staff. */
export function canDeactivateAppointmentSlot(
  slot: Pick<AppointmentSlotRecord, 'startsAt' | 'status'>,
  now = new Date(),
): boolean {
  return getAppointmentSlotEffectiveStatus(slot, now) === 'AVAILABLE'
}

/** Returns the non-negative interval duration in whole minutes. */
export function getAppointmentSlotDurationMinutes(
  slot: Pick<AppointmentSlotRecord, 'endsAt' | 'startsAt'>,
): number | null {
  const startsAt = Date.parse(slot.startsAt)
  const endsAt = Date.parse(slot.endsAt)

  if (
    !Number.isFinite(startsAt) ||
    !Number.isFinite(endsAt) ||
    endsAt <= startsAt
  ) {
    return null
  }

  return Math.round((endsAt - startsAt) / 60_000)
}

/** Formats one slot duration for table and compact-card metadata. */
export function getAppointmentSlotDurationLabel(
  slot: Pick<AppointmentSlotRecord, 'endsAt' | 'startsAt'>,
): string {
  const minutes = getAppointmentSlotDurationMinutes(slot)

  if (minutes === null) {
    return 'Nicht verfügbar'
  }
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  const hoursLabel = `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`

  return remainingMinutes === 0
    ? hoursLabel
    : `${hoursLabel} ${remainingMinutes} Minuten`
}
