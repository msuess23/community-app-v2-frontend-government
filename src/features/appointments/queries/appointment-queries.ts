import { infiniteQueryOptions, keepPreviousData } from '@tanstack/react-query'

import type { ListInternalAppointmentsApiV1AppointmentsInternalGetParams } from '@/api/generated/models'
import {
  getAppointmentApiV1AppointmentsAppointmentIdGet,
  getInternalAppointmentFilterOptionsApiV1AppointmentsInternalFilterOptionsGet,
  listAppointmentEventsApiV1AppointmentsAppointmentIdEventsGet,
  listInternalAppointmentsApiV1AppointmentsInternalGet,
} from '@/api/generated/appointments/appointments'
import type { PageModel } from '@/api/contract/pagination'
import { createMappedQueryOptions } from '@/api/contract/query-options'
import {
  mapAppointmentFilterOptions,
  mapAppointmentPage,
  mapAppointmentResponse,
} from '@/features/appointments/model/appointment-mapper'
import {
  mapAppointmentEventPage,
  type AppointmentEventRecord,
} from '@/features/appointments/model/appointment-event'
import { appointmentFeatureQueryKeys } from '@/features/appointments/queries/appointment-query-keys'

/** Creates the paginated, office-scoped authority appointment directory query. */
export function createAppointmentDirectoryQueryOptions(
  params: ListInternalAppointmentsApiV1AppointmentsInternalGetParams,
) {
  return createMappedQueryOptions({
    map: mapAppointmentPage,
    options: { placeholderData: keepPreviousData },
    queryFn: (signal) =>
      listInternalAppointmentsApiV1AppointmentsInternalGet(params, { signal }),
    queryKey: appointmentFeatureQueryKeys.list(params),
  })
}

/** Creates readable citizen and ticket options restricted by the backend office scope. */
export function createAppointmentFilterOptionsQueryOptions() {
  return createMappedQueryOptions({
    map: mapAppointmentFilterOptions,
    queryFn: (signal) =>
      getInternalAppointmentFilterOptionsApiV1AppointmentsInternalFilterOptionsGet(
        { signal },
      ),
    queryKey: appointmentFeatureQueryKeys.filterOptions(),
  })
}

/** Creates the query for one current server-owned appointment projection. */
export function createAppointmentDetailQueryOptions(appointmentId: string) {
  return createMappedQueryOptions({
    map: mapAppointmentResponse,
    queryFn: (signal) =>
      getAppointmentApiV1AppointmentsAppointmentIdGet(appointmentId, {
        signal,
      }),
    queryKey: appointmentFeatureQueryKeys.detail(appointmentId),
  })
}

const APPOINTMENT_EVENT_PAGE_SIZE = 20

/** Creates newest-first pages for the immutable appointment event stream. */
export function createAppointmentEventsInfiniteQueryOptions(
  appointmentId: string,
) {
  return infiniteQueryOptions({
    getNextPageParam: (lastPage: PageModel<AppointmentEventRecord>) =>
      lastPage.page < lastPage.pageCount ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    queryFn: async ({
      pageParam,
      signal,
    }: Readonly<{ pageParam: number; signal: AbortSignal }>) =>
      mapAppointmentEventPage(
        await listAppointmentEventsApiV1AppointmentsAppointmentIdEventsGet(
          appointmentId,
          { page: pageParam, size: APPOINTMENT_EVENT_PAGE_SIZE },
          { signal },
        ),
      ),
    queryKey: appointmentFeatureQueryKeys.events(appointmentId),
  })
}
