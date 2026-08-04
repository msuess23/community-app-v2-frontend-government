import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createInfoApiV1InfosPost,
  updateInfoApiV1InfosInfoIdPut,
} from '@/api/generated/infos/infos'
import type { AuthUser } from '@/auth/auth-types'
import {
  toInfoCreate,
  toInfoUpdate,
  type InfoFormValues,
} from '@/features/infos/model/info-form'
import { mapInfoResponse } from '@/features/infos/model/info-mapper'
import type { InfoRecord } from '@/features/infos/model/info-model'
import { infoFeatureQueryKeys } from '@/features/infos/queries/info-query-keys'
import { commitMutationResult } from '@/shared/remote-data/mutation-cache'

export type UpdateInfoVariables = Readonly<{
  info: InfoRecord
  values: InfoFormValues
}>

/** Creates one Info and refreshes every paginated publication projection. */
export function useCreateInfoMutation(currentUser: AuthUser) {
  const queryClient = useQueryClient()

  return useMutation<InfoRecord, unknown, InfoFormValues>({
    mutationFn: async (values) =>
      mapInfoResponse(
        await createInfoApiV1InfosPost(toInfoCreate(values, currentUser)),
      ),
    mutationKey: ['infos', 'create'],
    onSuccess: async (info) => {
      await commitMutationResult(queryClient, {
        data: info,
        detailKey: infoFeatureQueryKeys.detail(info.id),
        invalidate: [infoFeatureQueryKeys.lists()],
      })
    },
  })
}

/** Updates one mutable Info row and commits only the server-confirmed response. */
export function useUpdateInfoMutation(currentUser: AuthUser) {
  const queryClient = useQueryClient()

  return useMutation<InfoRecord, unknown, UpdateInfoVariables>({
    mutationFn: async ({ info, values }) =>
      mapInfoResponse(
        await updateInfoApiV1InfosInfoIdPut(
          info.id,
          toInfoUpdate(values, info, currentUser),
        ),
      ),
    mutationKey: ['infos', 'update'],
    onSuccess: async (updatedInfo) => {
      await commitMutationResult(queryClient, {
        data: updatedInfo,
        detailKey: infoFeatureQueryKeys.detail(updatedInfo.id),
        invalidate: [infoFeatureQueryKeys.lists()],
      })
    },
  })
}
