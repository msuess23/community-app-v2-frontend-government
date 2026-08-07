import type {
  AppointmentCancelRequest,
  AppointmentCompleteRequest,
  AppointmentNoShowRequest,
  AppointmentRescheduleRequest,
} from '@/api/generated/models'
import {
  cancelAppointmentApiV1AppointmentsAppointmentIdCancelPost,
  completeAppointmentApiV1AppointmentsAppointmentIdCompletePost,
  markAppointmentNoShowApiV1AppointmentsAppointmentIdNoShowPost,
  rescheduleAppointmentApiV1AppointmentsAppointmentIdReschedulePost,
} from '@/api/generated/appointments/appointments'
import {
  APPOINTMENT_LIFECYCLE_ERROR_MESSAGES,
  getAppointmentLifecycleErrorPresentation,
} from '@/features/appointments/model/appointment-lifecycle'
import { mapAppointmentResponse } from '@/features/appointments/model/appointment-mapper'
import type { AppointmentRecord } from '@/features/appointments/model/appointment-model'
import {
  appointmentFeatureQueryKeys,
  appointmentSlotQueryKeys,
} from '@/features/appointments/queries/appointment-query-keys'
import { useResourceActionMutation } from '@/shared/resource-detail/use-resource-action-mutation'

export type AppointmentLifecycleVariables =
  | Readonly<{
      action: 'RESCHEDULE'
      appointmentId: string
      request: AppointmentRescheduleRequest
    }>
  | Readonly<{
      action: 'CANCEL'
      appointmentId: string
      request: AppointmentCancelRequest
    }>
  | Readonly<{
      action: 'COMPLETE'
      appointmentId: string
      request: AppointmentCompleteRequest
    }>
  | Readonly<{
      action: 'MARK_NO_SHOW'
      appointmentId: string
      request: AppointmentNoShowRequest
    }>

/** Executes one server-allowed appointment command without optimistic state. */
export function useExecuteAppointmentLifecycleMutation() {
  return useResourceActionMutation<
    AppointmentRecord,
    AppointmentLifecycleVariables
  >({
    conflictQueryKeys: ({ appointmentId }) => [
      appointmentFeatureQueryKeys.detail(appointmentId),
      appointmentFeatureQueryKeys.events(appointmentId),
      appointmentFeatureQueryKeys.lists(),
      appointmentSlotQueryKeys.all,
    ],
    errorPresentation: {
      fallback: getAppointmentLifecycleErrorPresentation(undefined),
      messagesByErrorCode: APPOINTMENT_LIFECYCLE_ERROR_MESSAGES,
    },
    getCachePlan: (_, { appointmentId }) => ({
      detailKey: appointmentFeatureQueryKeys.detail(appointmentId),
      invalidate: [
        appointmentFeatureQueryKeys.lists(),
        appointmentFeatureQueryKeys.events(appointmentId),
        appointmentFeatureQueryKeys.filterOptions(),
        appointmentSlotQueryKeys.all,
      ],
    }),
    mutationFn: executeAppointmentLifecycle,
    mutationKey: ['appointments', 'lifecycle'],
    successFeedback: (_, variables) => getLifecycleSuccessFeedback(variables),
  })
}

async function executeAppointmentLifecycle(
  variables: AppointmentLifecycleVariables,
): Promise<AppointmentRecord> {
  switch (variables.action) {
    case 'RESCHEDULE':
      return mapAppointmentResponse(
        await rescheduleAppointmentApiV1AppointmentsAppointmentIdReschedulePost(
          variables.appointmentId,
          variables.request,
        ),
      )
    case 'CANCEL':
      return mapAppointmentResponse(
        await cancelAppointmentApiV1AppointmentsAppointmentIdCancelPost(
          variables.appointmentId,
          variables.request,
        ),
      )
    case 'COMPLETE':
      return mapAppointmentResponse(
        await completeAppointmentApiV1AppointmentsAppointmentIdCompletePost(
          variables.appointmentId,
          variables.request,
        ),
      )
    case 'MARK_NO_SHOW':
      return mapAppointmentResponse(
        await markAppointmentNoShowApiV1AppointmentsAppointmentIdNoShowPost(
          variables.appointmentId,
          variables.request,
        ),
      )
  }
}

function getLifecycleSuccessFeedback(
  variables: AppointmentLifecycleVariables,
): Readonly<{ description: string; title: string }> {
  switch (variables.action) {
    case 'RESCHEDULE':
      return {
        description:
          'Der bisherige Terminslot wurde freigegeben und der neue Terminslot verbindlich gebucht.',
        title: 'Termin verschoben',
      }
    case 'CANCEL':
      return {
        description:
          'Der Termin wurde storniert und der bisherige Terminslot wieder freigegeben.',
        title: 'Termin storniert',
      }
    case 'COMPLETE':
      return {
        description:
          'Der Termin wurde abgeschlossen und der Terminslot als verbraucht markiert.',
        title: 'Termin abgeschlossen',
      }
    case 'MARK_NO_SHOW':
      return {
        description:
          'Das Nichterscheinen wurde dokumentiert und der Terminslot als verbraucht markiert.',
        title: 'Nicht erschienen dokumentiert',
      }
  }
}
