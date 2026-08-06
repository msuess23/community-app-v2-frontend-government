import type {
  ListAppointmentSlotsApiV1OfficesOfficeIdAppointmentSlotsGetParams,
  ListInternalAppointmentsApiV1AppointmentsInternalGetParams,
} from '@/api/generated/models'
import { createResourceQueryKeys } from '@/shared/remote-data/query-keys'

const baseAppointmentQueryKeys = createResourceQueryKeys<
  ListInternalAppointmentsApiV1AppointmentsInternalGetParams,
  string
>('appointment-feature')

/** Owns authority appointment projections and their separately scoped options. */
export const appointmentFeatureQueryKeys = {
  ...baseAppointmentQueryKeys,
  events: (appointmentId: string) =>
    baseAppointmentQueryKeys.related(appointmentId, 'events'),
  filterOptions: () =>
    baseAppointmentQueryKeys.related('directory', 'filter-options'),
}

type AppointmentSlotListQueryParameters =
  ListAppointmentSlotsApiV1OfficesOfficeIdAppointmentSlotsGetParams &
    Readonly<{ officeId: string }>

const baseAppointmentSlotQueryKeys =
  createResourceQueryKeys<AppointmentSlotListQueryParameters, string>(
    'appointment-slot-feature',
  )

/** Owns office-scoped appointment-slot capacity projections. */
export const appointmentSlotQueryKeys = {
  ...baseAppointmentSlotQueryKeys,
  availableForReschedule: (officeId: string, startsFrom: string) =>
    baseAppointmentSlotQueryKeys.related(officeId, 'reschedule-options', {
      startsFrom,
    }),
}
