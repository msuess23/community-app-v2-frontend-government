import type { AppointmentSlotStatus } from '@/api/generated/models'
import {
  APPOINTMENT_SLOT_STATUSES,
  getAppointmentSlotStatusLabel,
} from '@/features/appointments/model/appointment-slot-model'
import type {
  ActiveDataViewFilter,
  DataViewFilterOption,
} from '@/shared/data-view/DataViewFilters'

export const APPOINTMENT_SLOT_STATUS_FILTER_OPTIONS: readonly DataViewFilterOption[] =
  APPOINTMENT_SLOT_STATUSES.map((status) => ({
    label: getAppointmentSlotStatusLabel(status),
    value: status,
  }))

export type AppointmentSlotActiveFilterInput = Readonly<{
  onSetStartsFrom: (value: string) => void
  onSetStartsTo: (value: string) => void
  onSetStatus: (value: string) => void
  startsFrom: string
  startsTo: string
  status: string
}>

/** Builds removable filter chips from the URL-owned slot-directory state. */
export function createAppointmentSlotActiveFilters(
  input: AppointmentSlotActiveFilterInput,
): readonly ActiveDataViewFilter[] {
  const filters: ActiveDataViewFilter[] = []

  if (
    input.status &&
    APPOINTMENT_SLOT_STATUSES.includes(input.status as AppointmentSlotStatus)
  ) {
    filters.push({
      key: 'status',
      label: `Status: ${getAppointmentSlotStatusLabel(
        input.status as AppointmentSlotStatus,
      )}`,
      onRemove: () => input.onSetStatus(''),
    })
  }
  if (input.startsFrom) {
    filters.push({
      key: 'startsFrom',
      label: `Beginn ab: ${input.startsFrom}`,
      onRemove: () => input.onSetStartsFrom(''),
    })
  }
  if (input.startsTo) {
    filters.push({
      key: 'startsTo',
      label: `Beginn bis: ${input.startsTo}`,
      onRemove: () => input.onSetStartsTo(''),
    })
  }

  return filters
}
