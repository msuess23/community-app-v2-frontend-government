import type { OfficeResponse } from '@/api/generated/models'
import type { OfficeReference } from '@/shared/offices/office-model'

/** Converts an office DTO into the small reference model shared across features. */
export function mapOfficeReference(response: OfficeResponse): OfficeReference {
  return {
    id: response.id,
    isActive: response.metadata.is_active,
    name: response.name,
  }
}
