import { keepPreviousData } from '@tanstack/react-query'

import type {
  GetAllOfficesApiV1OfficesGetParams,
  GetOfficeHistoryApiV1OfficesOfficeIdHistoryGetParams,
} from '@/api/generated/models'
import {
  getAllOfficesApiV1OfficesGet,
  getOfficeApiV1OfficesOfficeIdGet,
  getOfficeHistoryApiV1OfficesOfficeIdHistoryGet,
} from '@/api/generated/offices/offices'
import { createMappedQueryOptions } from '@/api/contract/query-options'
import {
  mapOfficePage,
  mapOfficeResponse,
} from '@/features/offices/model/office-mapper'
import { mapOfficeHistoryPage } from '@/features/offices/model/office-history'
import { officeFeatureQueryKeys } from '@/features/offices/queries/office-query-keys'

/** Creates a role-scoped, paginated office-directory query. */
export function createOfficeFeatureDirectoryQueryOptions(
  params: GetAllOfficesApiV1OfficesGetParams,
) {
  return createMappedQueryOptions({
    map: mapOfficePage,
    options: {
      placeholderData: keepPreviousData,
    },
    queryFn: (signal) =>
      getAllOfficesApiV1OfficesGet(params, {
        signal,
      }),
    queryKey: officeFeatureQueryKeys.list(params),
  })
}

/** Creates the backend-authorized query for one office detail page. */
export function createOfficeDetailQueryOptions(officeId: string) {
  return createMappedQueryOptions({
    map: mapOfficeResponse,
    queryFn: (signal) =>
      getOfficeApiV1OfficesOfficeIdGet(officeId, {
        signal,
      }),
    queryKey: officeFeatureQueryKeys.detail(officeId),
  })
}

/** Creates the administrator-only query for one immutable office history page. */
export function createOfficeHistoryQueryOptions(
  officeId: string,
  params: GetOfficeHistoryApiV1OfficesOfficeIdHistoryGetParams,
) {
  return createMappedQueryOptions({
    map: mapOfficeHistoryPage,
    options: {
      placeholderData: keepPreviousData,
    },
    queryFn: (signal) =>
      getOfficeHistoryApiV1OfficesOfficeIdHistoryGet(officeId, params, {
        signal,
      }),
    queryKey: officeFeatureQueryKeys.history(officeId, params),
  })
}
