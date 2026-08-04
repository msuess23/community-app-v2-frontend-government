import type { ListInfosApiV1InfosGetParams } from '@/api/generated/models'
import { createResourceQueryKeys } from '@/shared/remote-data/query-keys'

const baseInfoQueryKeys = createResourceQueryKeys<
  ListInfosApiV1InfosGetParams,
  string
>('info-feature')

/** Owns Info master data and its separately managed status and image resources. */
export const infoFeatureQueryKeys = {
  ...baseInfoQueryKeys,
  images: (infoId: string) =>
    baseInfoQueryKeys.related(infoId, 'images'),
  statusHistory: (infoId: string) =>
    baseInfoQueryKeys.related(infoId, 'status-history'),
}
