import type {
  GetAllOfficesApiV1OfficesGetParams,
  GetOfficeHistoryApiV1OfficesOfficeIdHistoryGetParams,
} from '@/api/generated/models'
import { createResourceQueryKeys } from '@/shared/remote-data/query-keys'

const baseOfficeFeatureQueryKeys = createResourceQueryKeys<
  GetAllOfficesApiV1OfficesGetParams,
  string
>('office-feature')

/** Owns the full office-feature query data separately from shared name references. */
export const officeFeatureQueryKeys = {
  ...baseOfficeFeatureQueryKeys,
  histories: (officeId: string) =>
    baseOfficeFeatureQueryKeys.related(officeId, 'history'),
  history: (
    officeId: string,
    params: GetOfficeHistoryApiV1OfficesOfficeIdHistoryGetParams,
  ) => baseOfficeFeatureQueryKeys.related(officeId, 'history', params),
}
