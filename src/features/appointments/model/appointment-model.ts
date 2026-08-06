import type {
  AppointmentAction,
  AppointmentStatus,
} from '@/api/generated/models'

export type { AppointmentAction, AppointmentStatus } from '@/api/generated/models'

export const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const satisfies readonly AppointmentStatus[]

export type AppointmentOfficeReference = Readonly<{
  id: string
  name: string
}>

export type AppointmentUserReference = Readonly<{
  displayName: string
  id: string
}>

export type AppointmentTicketReference = Readonly<{
  canView: boolean
  id: string
  title: string
}>

/** Current server-owned appointment projection used throughout the authority client. */
export type AppointmentRecord = Readonly<{
  allowedActions: readonly AppointmentAction[]
  cancelledAt: string | null
  citizen: AppointmentUserReference
  completedAt: string | null
  createdAt: string
  currentSlotId: string | null
  endsAt: string
  id: string
  office: AppointmentOfficeReference
  reason: string | null
  startsAt: string
  status: AppointmentStatus
  ticket: AppointmentTicketReference | null
  updatedAt: string
  version: number
}>

const STATUS_LABELS: Readonly<Record<AppointmentStatus, string>> = {
  CANCELLED: 'Storniert',
  COMPLETED: 'Abgeschlossen',
  NO_SHOW: 'Nicht erschienen',
  SCHEDULED: 'Geplant',
}

/** Localizes one backend appointment status without changing its contract value. */
export function getAppointmentStatusLabel(status: AppointmentStatus): string {
  return STATUS_LABELS[status]
}

/** Returns the non-negative planned duration in whole minutes. */
export function getAppointmentDurationMinutes(
  appointment: Pick<AppointmentRecord, 'endsAt' | 'startsAt'>,
): number | null {
  const startsAt = Date.parse(appointment.startsAt)
  const endsAt = Date.parse(appointment.endsAt)
  if (
    !Number.isFinite(startsAt) ||
    !Number.isFinite(endsAt) ||
    endsAt <= startsAt
  ) {
    return null
  }
  return Math.round((endsAt - startsAt) / 60_000)
}

/** Formats a planned appointment duration for compact list and detail metadata. */
export function getAppointmentDurationLabel(
  appointment: Pick<AppointmentRecord, 'endsAt' | 'startsAt'>,
): string {
  const minutes = getAppointmentDurationMinutes(appointment)
  if (minutes === null) {
    return 'Nicht verfügbar'
  }
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  const hourLabel = `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`
  return remainingMinutes === 0
    ? hourLabel
    : `${hourLabel} ${remainingMinutes} Minuten`
}

/** Builds a stable accessible label for one appointment row or card. */
export function getAppointmentAccessibleLabel(
  appointment: AppointmentRecord,
): string {
  return `Termin mit ${appointment.citizen.displayName}`
}
