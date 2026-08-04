import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  deleteInfoApiV1InfosInfoIdDelete,
  updateInfoStatusApiV1InfosInfoIdStatusPut,
} from '@/api/generated/infos/infos'
import {
  toInfoStatusCreateRequest,
  type InfoStatusUpdateFormValues,
} from '@/features/infos/model/info-lifecycle'
import { mapInfoStatusResponse } from '@/features/infos/model/info-mapper'
import type {
  InfoRecord,
  InfoStatusRecord,
} from '@/features/infos/model/info-model'
import { infoFeatureQueryKeys } from '@/features/infos/queries/info-query-keys'

export type UpdateInfoStatusVariables = Readonly<{
  infoId: string
  values: InfoStatusUpdateFormValues
}>

/** Appends one public status row and updates every affected current projection. */
export function useUpdateInfoStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation<InfoStatusRecord, unknown, UpdateInfoStatusVariables>({
    mutationFn: async ({ infoId, values }) =>
      mapInfoStatusResponse(
        await updateInfoStatusApiV1InfosInfoIdStatusPut(
          infoId,
          toInfoStatusCreateRequest(values),
        ),
      ),
    mutationKey: ['infos', 'status', 'update'],
    onSuccess: async (statusEntry, { infoId }) => {
      const detailKey = infoFeatureQueryKeys.detail(infoId)
      const historyKey = infoFeatureQueryKeys.statusHistory(infoId)

      await Promise.all([
        queryClient.cancelQueries({ exact: true, queryKey: detailKey }),
        queryClient.cancelQueries({ exact: true, queryKey: historyKey }),
      ])

      queryClient.setQueryData<InfoRecord>(detailKey, (current) =>
        current
          ? {
              ...current,
              currentStatus: statusEntry,
              updatedAt: statusEntry.createdAt,
            }
          : current,
      )
      queryClient.setQueryData<InfoStatusRecord[]>(historyKey, (current) => [
        statusEntry,
        ...(current ?? []).filter((entry) => entry.id !== statusEntry.id),
      ])

      await queryClient.invalidateQueries({
        queryKey: infoFeatureQueryKeys.lists(),
      })
    },
  })
}

/** Physically deletes one Info and removes all detail-owned cache resources. */
export function useDeleteInfoMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, string>({
    mutationFn: (infoId) => deleteInfoApiV1InfosInfoIdDelete(infoId),
    mutationKey: ['infos', 'delete'],
    onSuccess: async (_, infoId) => {
      const detailKey = infoFeatureQueryKeys.detail(infoId)

      await queryClient.cancelQueries({ queryKey: detailKey })
      queryClient.removeQueries({ queryKey: detailKey })
      await queryClient.invalidateQueries({
        queryKey: infoFeatureQueryKeys.lists(),
      })
    },
  })
}
