import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createOfficeApiV1OfficesPost,
  updateOfficeApiV1OfficesOfficeIdPatch,
} from '@/api/generated/offices/offices'
import {
  toOfficeCreate,
  toOfficeUpdate,
  type OfficeFormValues,
} from '@/features/offices/model/office-form'
import { mapOfficeResponse } from '@/features/offices/model/office-mapper'
import type { OfficeRecord } from '@/features/offices/model/office-model'
import { officeFeatureQueryKeys } from '@/features/offices/queries/office-query-keys'
import { officeQueryKeys } from '@/shared/offices/office-queries'
import { commitMutationResult } from '@/shared/remote-data/mutation-cache'

export type UpdateOfficeVariables = Readonly<{
  office: OfficeRecord
  values: OfficeFormValues
}>

/** Creates an office and refreshes full and reference-oriented office projections. */
export function useCreateOfficeMutation() {
  const queryClient = useQueryClient()

  return useMutation<OfficeRecord, unknown, OfficeFormValues>({
    mutationFn: async (values) =>
      mapOfficeResponse(
        await createOfficeApiV1OfficesPost(toOfficeCreate(values)),
      ),
    mutationKey: ['offices', 'create'],
    onSuccess: async (office) => {
      await commitMutationResult(queryClient, {
        data: office,
        detailKey: officeFeatureQueryKeys.detail(office.id),
        invalidate: [officeFeatureQueryKeys.lists(), officeQueryKeys.all],
      })
    },
  })
}

/** Updates one active office and commits only the server-confirmed response. */
export function useUpdateOfficeMutation() {
  const queryClient = useQueryClient()

  return useMutation<OfficeRecord, unknown, UpdateOfficeVariables>({
    mutationFn: async ({ office, values }) =>
      mapOfficeResponse(
        await updateOfficeApiV1OfficesOfficeIdPatch(
          office.id,
          toOfficeUpdate(values, office),
        ),
      ),
    mutationKey: ['offices', 'update'],
    onSuccess: async (updatedOffice) => {
      await commitMutationResult(queryClient, {
        data: updatedOffice,
        detailKey: officeFeatureQueryKeys.detail(updatedOffice.id),
        invalidate: [officeFeatureQueryKeys.lists(), officeQueryKeys.all],
      })
    },
  })
}
