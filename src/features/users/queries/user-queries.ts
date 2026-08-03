import { keepPreviousData } from '@tanstack/react-query'

import type {
  GetAllUsersApiV1UsersGetParams,
  GetUserHistoryApiV1UsersUserIdHistoryGetParams,
} from '@/api/generated/models'
import {
  getAllUsersApiV1UsersGet,
  getUserApiV1UsersUserIdGet,
  getUserHistoryApiV1UsersUserIdHistoryGet,
} from '@/api/generated/users/users'
import { createMappedQueryOptions } from '@/api/contract/query-options'
import {
  mapUserPage,
  mapUserResponse,
} from '@/features/users/model/user-mapper'
import { mapUserHistoryPage } from '@/features/users/model/user-history'
import { userQueryKeys } from '@/features/users/queries/user-query-keys'

/** Creates a role-scoped, paginated user-directory query. */
export function createUserDirectoryQueryOptions(
  params: GetAllUsersApiV1UsersGetParams,
) {
  return createMappedQueryOptions({
    map: mapUserPage,
    options: {
      placeholderData: keepPreviousData,
    },
    queryFn: (signal) =>
      getAllUsersApiV1UsersGet(params, {
        signal,
      }),
    queryKey: userQueryKeys.list(params),
  })
}

/** Creates the object-authorized query for one user detail page. */
export function createUserDetailQueryOptions(userId: string) {
  return createMappedQueryOptions({
    map: mapUserResponse,
    queryFn: (signal) =>
      getUserApiV1UsersUserIdGet(userId, {
        signal,
      }),
    queryKey: userQueryKeys.detail(userId),
  })
}


/** Creates the administrator-only query for one immutable user history page. */
export function createUserHistoryQueryOptions(
  userId: string,
  params: GetUserHistoryApiV1UsersUserIdHistoryGetParams,
) {
  return createMappedQueryOptions({
    map: mapUserHistoryPage,
    options: {
      placeholderData: keepPreviousData,
    },
    queryFn: (signal) =>
      getUserHistoryApiV1UsersUserIdHistoryGet(userId, params, { signal }),
    queryKey: userQueryKeys.history(userId, params),
  })
}
