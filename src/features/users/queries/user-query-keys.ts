import type { GetAllUsersApiV1UsersGetParams } from '@/api/generated/models'
import { createResourceQueryKeys } from '@/shared/remote-data/query-keys'

/** Owns every query-key segment used by the user feature. */
export const userQueryKeys = createResourceQueryKeys<
  GetAllUsersApiV1UsersGetParams,
  string
>('users')
