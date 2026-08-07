import {
  infiniteQueryOptions,
  keepPreviousData,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import { isApiError } from '@/api/client/api-error'
import type {
  ListAppointmentSlotsApiV1OfficesOfficeIdAppointmentSlotsGetParams,
} from '@/api/generated/models'
import {
  createAppointmentSlotsApiV1OfficesOfficeIdAppointmentSlotsPost,
  deactivateAppointmentSlotApiV1OfficesOfficeIdAppointmentSlotsSlotIdDelete,
  listAppointmentSlotsApiV1OfficesOfficeIdAppointmentSlotsGet,
} from '@/api/generated/appointment-slots/appointment-slots'
import type { PageModel } from '@/api/contract/pagination'
import { createMappedQueryOptions } from '@/api/contract/query-options'
import {
  mapAppointmentSlotPage,
  mapAppointmentSlotResponse,
} from '@/features/appointments/model/appointment-slot-mapper'
import type {
  AppointmentSlotBatchFormValues,
} from '@/features/appointments/model/appointment-slot-form'
import { toAppointmentSlotBatchCreate } from '@/features/appointments/model/appointment-slot-form'
import type { AppointmentSlotRecord } from '@/features/appointments/model/appointment-slot-model'
import { appointmentSlotQueryKeys } from '@/features/appointments/queries/appointment-query-keys'
import { refreshQueryKeys } from '@/shared/remote-data/mutation-cache'

const APPOINTMENT_RESCHEDULE_SLOT_PAGE_SIZE = 100

/** Creates incrementally loaded future availability for one reschedule dialog. */
export function createAvailableAppointmentSlotsInfiniteQueryOptions(
  officeId: string,
  startsFrom: string,
) {
  return infiniteQueryOptions({
    getNextPageParam: (lastPage: PageModel<AppointmentSlotRecord>) =>
      lastPage.page < lastPage.pageCount ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    queryFn: async ({
      pageParam,
      signal,
    }: Readonly<{ pageParam: number; signal: AbortSignal }>) =>
      mapAppointmentSlotPage(
        await listAppointmentSlotsApiV1OfficesOfficeIdAppointmentSlotsGet(
          officeId,
          {
            order: 'asc',
            page: pageParam,
            size: APPOINTMENT_RESCHEDULE_SLOT_PAGE_SIZE,
            sort_by: 'starts_at',
            starts_from: startsFrom,
            status: 'AVAILABLE',
          },
          { signal },
        ),
      ),
    queryKey: appointmentSlotQueryKeys.availableForReschedule(
      officeId,
      startsFrom,
    ),
  })
}

/** Creates the paginated, office-scoped authority slot-directory query. */
export function createAppointmentSlotDirectoryQueryOptions(
  officeId: string,
  params: ListAppointmentSlotsApiV1OfficesOfficeIdAppointmentSlotsGetParams,
) {
  return createMappedQueryOptions({
    map: mapAppointmentSlotPage,
    options: { placeholderData: keepPreviousData },
    queryFn: (signal) =>
      listAppointmentSlotsApiV1OfficesOfficeIdAppointmentSlotsGet(
        officeId,
        params,
        { signal },
      ),
    queryKey: appointmentSlotQueryKeys.list({ officeId, ...params }),
  })
}

export type CreateAppointmentSlotsVariables = Readonly<{
  officeId: string
  values: AppointmentSlotBatchFormValues
}>

/** Creates a server-validated slot batch and refreshes all slot lists. */
export function useCreateAppointmentSlotsMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    readonly AppointmentSlotRecord[],
    unknown,
    CreateAppointmentSlotsVariables
  >({
    mutationFn: async ({ officeId, values }) =>
      (
        await createAppointmentSlotsApiV1OfficesOfficeIdAppointmentSlotsPost(
          officeId,
          toAppointmentSlotBatchCreate(values),
        )
      ).map(mapAppointmentSlotResponse),
    mutationKey: ['appointments', 'slots', 'create'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: appointmentSlotQueryKeys.lists(),
      })
    },
  })
}

export type DeactivateAppointmentSlotVariables = Readonly<{
  officeId: string
  slotId: string
}>

/** Deactivates one future free slot without applying an optimistic state. */
export function useDeactivateAppointmentSlotMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, DeactivateAppointmentSlotVariables>({
    mutationFn: ({ officeId, slotId }) =>
      deactivateAppointmentSlotApiV1OfficesOfficeIdAppointmentSlotsSlotIdDelete(
        officeId,
        slotId,
      ),
    mutationKey: ['appointments', 'slots', 'deactivate'],
    onError: async (error) => {
      if (
        isApiError(error) &&
        [
          'APPOINTMENT_SLOT_NOT_AVAILABLE',
          'APPOINTMENT_SLOT_IN_PAST',
          'APPOINTMENT_SLOT_NOT_FOUND',
        ].includes(error.errorCode ?? '')
      ) {
        await refreshQueryKeys(queryClient, [appointmentSlotQueryKeys.lists()])
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: appointmentSlotQueryKeys.lists(),
      })
    },
  })
}
