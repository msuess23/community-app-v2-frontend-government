import { useMutation, useQueryClient } from '@tanstack/react-query'

import { isApiError } from '@/api/client/api-error'
import {
  deactivateOfficeApiV1OfficesOfficeIdDelete,
  getOfficeApiV1OfficesOfficeIdGet,
} from '@/api/generated/offices/offices'
import {
  toOfficeDeactivateRequest,
  type OfficeDeactivationFormValues,
} from '@/features/offices/model/office-deactivation'
import { mapOfficeResponse } from '@/features/offices/model/office-mapper'
import type { OfficeRecord } from '@/features/offices/model/office-model'
import { officeFeatureQueryKeys } from '@/features/offices/queries/office-query-keys'
import { officeQueryKeys } from '@/shared/offices/office-queries'
import {
  commitMutationResult,
  refreshQueryKeys,
} from '@/shared/remote-data/mutation-cache'

export type DeactivateOfficeVariables = Readonly<{
  officeId: string
  values: OfficeDeactivationFormValues
}>

/** Deactivates one office and then reloads its authoritative post-action state. */
export function useDeactivateOfficeMutation() {
  const queryClient = useQueryClient()

  return useMutation<OfficeRecord, unknown, DeactivateOfficeVariables>({
    mutationFn: async ({ officeId, values }) => {
      await deactivateOfficeApiV1OfficesOfficeIdDelete(
        officeId,
        toOfficeDeactivateRequest(values),
      )

      // DELETE returns 204, so the follow-up GET is the authoritative lifecycle projection.
      return mapOfficeResponse(
        await getOfficeApiV1OfficesOfficeIdGet(officeId),
      )
    },
    mutationKey: ['offices', 'deactivate'],
    onError: async (error, variables) => {
      if (
        !isApiError(error) ||
        error.errorCode !== 'OFFICE_ALREADY_DEACTIVATED'
      ) {
        return
      }

      await refreshQueryKeys(queryClient, [
        officeFeatureQueryKeys.detail(variables.officeId),
        officeFeatureQueryKeys.lists(),
        officeFeatureQueryKeys.histories(variables.officeId),
        officeQueryKeys.all,
      ])
    },
    onSuccess: async (deactivatedOffice, variables) => {
      await commitMutationResult(queryClient, {
        data: deactivatedOffice,
        detailKey: officeFeatureQueryKeys.detail(variables.officeId),
        invalidate: [
          officeFeatureQueryKeys.lists(),
          officeFeatureQueryKeys.histories(variables.officeId),
          officeQueryKeys.all,
        ],
      })
    },
  })
}
