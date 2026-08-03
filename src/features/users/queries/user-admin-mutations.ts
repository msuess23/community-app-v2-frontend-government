import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateUserByAdminApiV1UsersUserIdPatch } from '@/api/generated/users/users'
import { useAuth } from '@/auth/auth-context'
import { mapUserResponse } from '@/features/users/model/user-mapper'
import type { UserRecord } from '@/features/users/model/user-model'
import type { UserAdminFormValues } from '@/features/users/model/user-admin-form'
import { toAdminUserUpdate } from '@/features/users/model/user-admin-form'
import { userQueryKeys } from '@/features/users/queries/user-query-keys'
import { commitMutationResult } from '@/shared/remote-data/mutation-cache'

export type UpdateUserByAdminVariables = Readonly<{
  userId: string
  values: UserAdminFormValues
}>

/** Updates one user and synchronizes detail, directory, and current-session projections. */
export function useUpdateUserByAdminMutation() {
  const queryClient = useQueryClient()
  const { refreshCurrentUser, user: currentUser } = useAuth()

  return useMutation<UserRecord, unknown, UpdateUserByAdminVariables>({
    mutationFn: async ({ userId, values }) =>
      mapUserResponse(
        await updateUserByAdminApiV1UsersUserIdPatch(
          userId,
          toAdminUserUpdate(values),
        ),
      ),
    mutationKey: ['users', 'admin-update'],
    onSuccess: async (updatedUser, variables) => {
      await commitMutationResult(queryClient, {
        data: updatedUser,
        detailKey: userQueryKeys.detail(variables.userId),
        invalidate: [
          userQueryKeys.lists(),
          userQueryKeys.histories(variables.userId),
        ],
      })

      if (currentUser?.id === updatedUser.id) {
        // Refresh the auth snapshot so App-Shell identity and capabilities match the server response.
        await refreshCurrentUser().catch(() => undefined)
      }
    },
  })
}
