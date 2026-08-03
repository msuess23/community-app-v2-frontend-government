import type { GetAllOfficesApiV1OfficesGetParams } from '@/api/generated/models'
import { createResourceQueryKeys } from '@/shared/remote-data/query-keys'

/** Owns the full office-feature query data separately from shared name references. */
export const officeFeatureQueryKeys = createResourceQueryKeys<
  GetAllOfficesApiV1OfficesGetParams,
  string
>('office-feature')
