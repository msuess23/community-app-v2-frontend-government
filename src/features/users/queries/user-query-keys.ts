import type {
  GetAllUsersApiV1UsersGetParams,
  GetUserHistoryApiV1UsersUserIdHistoryGetParams,
} from '@/api/generated/models'
import { createResourceQueryKeys } from '@/shared/remote-data/query-keys'

const baseUserQueryKeys = createResourceQueryKeys<
  GetAllUsersApiV1UsersGetParams,
  string
>('users')

/** Owns every query-key segment used by the user feature. */
export const userQueryKeys = {
  ...baseUserQueryKeys,
  histories: (userId: string) =>
    baseUserQueryKeys.related(userId, 'history'),
  history: (
    userId: string,
    params: GetUserHistoryApiV1UsersUserIdHistoryGetParams,
  ) => baseUserQueryKeys.related(userId, 'history', params),
}
