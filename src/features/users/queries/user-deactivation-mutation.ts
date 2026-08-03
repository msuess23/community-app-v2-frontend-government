import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  deactivateUserApiV1UsersUserIdDelete,
  getUserApiV1UsersUserIdGet,
} from '@/api/generated/users/users'
import {
  toUserDeactivateRequest,
  type UserDeactivationFormValues,
} from '@/features/users/model/user-deactivation'
import { mapUserResponse } from '@/features/users/model/user-mapper'
import type { UserRecord } from '@/features/users/model/user-model'
import { userQueryKeys } from '@/features/users/queries/user-query-keys'
import { commitMutationResult } from '@/shared/remote-data/mutation-cache'

export type DeactivateUserVariables = Readonly<{
  userId: string
  values: UserDeactivationFormValues
}>

/** Deactivates one user and then reloads the authoritative anonymized account state. */
export function useDeactivateUserMutation() {
  const queryClient = useQueryClient()

  return useMutation<UserRecord, unknown, DeactivateUserVariables>({
    mutationFn: async ({ userId, values }) => {
      await deactivateUserApiV1UsersUserIdDelete(
        userId,
        toUserDeactivateRequest(values),
      )

      // DELETE returns 204, so the follow-up GET is the first authoritative post-action projection.
      return mapUserResponse(await getUserApiV1UsersUserIdGet(userId))
    },
    mutationKey: ['users', 'deactivate'],
    onSuccess: async (deactivatedUser, variables) => {
      await commitMutationResult(queryClient, {
        data: deactivatedUser,
        detailKey: userQueryKeys.detail(variables.userId),
        invalidate: [
          userQueryKeys.lists(),
          userQueryKeys.histories(variables.userId),
        ],
      })
    },
  })
}
