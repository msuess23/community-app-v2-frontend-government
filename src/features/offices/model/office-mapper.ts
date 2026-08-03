import type {
  AddressResponse,
  OfficeResponse,
  OpeningHours,
  PaginatedResponseOfficeResponse,
} from '@/api/generated/models'
import { mapApiPage, type PageModel } from '@/api/contract/pagination'
import type {
  OfficeAddress,
  OfficeOpeningHours,
  OfficeRecord,
} from '@/features/offices/model/office-model'

/** Converts one generated office DTO into the model consumed by the office feature. */
export function mapOfficeResponse(response: OfficeResponse): OfficeRecord {
  return {
    address: response.address ? mapOfficeAddress(response.address) : null,
    contactEmail: response.contact_email ?? null,
    createdAt: response.metadata.created_at,
    deactivatedAt: response.metadata.deactivated_at ?? null,
    description: response.description ?? null,
    id: response.id,
    isActive: response.metadata.is_active,
    name: response.name,
    openingHours: response.opening_hours
      ? mapOfficeOpeningHours(response.opening_hours)
      : null,
    phone: response.phone ?? null,
    services: [...response.services],
  }
}

/** Converts the backend page envelope and every contained office. */
export function mapOfficePage(
  response: PaginatedResponseOfficeResponse,
): PageModel<OfficeRecord> {
  return mapApiPage(response, mapOfficeResponse)
}

/** Converts one generated address DTO without leaking snake-case property names. */
function mapOfficeAddress(response: AddressResponse): OfficeAddress {
  return {
    city: response.city,
    houseNumber: response.house_number,
    id: response.id,
    latitude: response.latitude ?? null,
    longitude: response.longitude ?? null,
    street: response.street,
    zipCode: response.zip_code,
  }
}

/** Completes optional generated weekday properties with explicit null values. */
function mapOfficeOpeningHours(response: OpeningHours): OfficeOpeningHours {
  return {
    friday: response.friday ?? null,
    monday: response.monday ?? null,
    saturday: response.saturday ?? null,
    sunday: response.sunday ?? null,
    thursday: response.thursday ?? null,
    tuesday: response.tuesday ?? null,
    wednesday: response.wednesday ?? null,
  }
}
