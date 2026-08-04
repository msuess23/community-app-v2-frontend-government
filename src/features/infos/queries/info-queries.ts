import { keepPreviousData } from '@tanstack/react-query'

import type {
  InfoImageResponse,
  InfoStatusResponse,
  ListInfosApiV1InfosGetParams,
} from '@/api/generated/models'
import {
  getInfoApiV1InfosInfoIdGet,
  getInfoStatusHistoryApiV1InfosInfoIdStatusGet,
  listInfoImagesApiV1InfosInfoIdImagesGet,
  listInfosApiV1InfosGet,
} from '@/api/generated/infos/infos'
import { createMappedQueryOptions } from '@/api/contract/query-options'
import {
  mapInfoImageResponse,
  mapInfoPage,
  mapInfoResponse,
  mapInfoStatusResponse,
} from '@/features/infos/model/info-mapper'
import { infoFeatureQueryKeys } from '@/features/infos/queries/info-query-keys'

/** Creates the paginated Info directory query with server-owned sorting. */
export function createInfoDirectoryQueryOptions(
  params: ListInfosApiV1InfosGetParams,
) {
  return createMappedQueryOptions({
    map: mapInfoPage,
    options: { placeholderData: keepPreviousData },
    queryFn: (signal) => listInfosApiV1InfosGet(params, { signal }),
    queryKey: infoFeatureQueryKeys.list(params),
  })
}

/** Creates the query for one current Info detail row. */
export function createInfoDetailQueryOptions(infoId: string) {
  return createMappedQueryOptions({
    map: mapInfoResponse,
    queryFn: (signal) =>
      getInfoApiV1InfosInfoIdGet(infoId, { signal }),
    queryKey: infoFeatureQueryKeys.detail(infoId),
  })
}

/** Loads the complete public status history in backend order. */
export function createInfoStatusHistoryQueryOptions(infoId: string) {
  return createMappedQueryOptions({
    map: (items: InfoStatusResponse[]) => items.map(mapInfoStatusResponse),
    queryFn: (signal) =>
      getInfoStatusHistoryApiV1InfosInfoIdStatusGet(infoId, { signal }),
    queryKey: infoFeatureQueryKeys.statusHistory(infoId),
  })
}

/** Loads every current image for the detail gallery. */
export function createInfoImagesQueryOptions(infoId: string) {
  return createMappedQueryOptions({
    map: (items: InfoImageResponse[]) => items.map(mapInfoImageResponse),
    queryFn: (signal) =>
      listInfoImagesApiV1InfosInfoIdImagesGet(infoId, { signal }),
    queryKey: infoFeatureQueryKeys.images(infoId),
  })
}
