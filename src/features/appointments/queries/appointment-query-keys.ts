import type { ListInternalAppointmentsApiV1AppointmentsInternalGetParams } from '@/api/generated/models'
import { createResourceQueryKeys } from '@/shared/remote-data/query-keys'

const baseAppointmentQueryKeys = createResourceQueryKeys<
  ListInternalAppointmentsApiV1AppointmentsInternalGetParams,
  string
>('appointment-feature')

/** Owns authority appointment projections and their separately scoped options. */
export const appointmentFeatureQueryKeys = {
  ...baseAppointmentQueryKeys,
  filterOptions: () =>
    baseAppointmentQueryKeys.related('directory', 'filter-options'),
}
