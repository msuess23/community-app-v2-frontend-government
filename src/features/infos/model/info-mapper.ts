import type {
  AddressResponse,
  InfoImageResponse,
  InfoResponse,
  InfoStatusResponse,
  PaginatedResponseInfoResponse,
} from '@/api/generated/models'
import { mapApiPage, type PageModel } from '@/api/contract/pagination'
import type {
  InfoAddress,
  InfoRecord,
  InfoStatusRecord,
} from '@/features/infos/model/info-model'
import type { MediaAsset } from '@/shared/media/media-model'

/** Converts one generated Info DTO into the model consumed by the Info feature. */
export function mapInfoResponse(response: InfoResponse): InfoRecord {
  return {
    address: response.address ? mapInfoAddress(response.address) : null,
    category: response.category,
    createdAt: response.created_at,
    currentStatus: mapInfoStatusResponse(response.current_status),
    description: response.description ?? null,
    endsAt: response.ends_at,
    id: response.id,
    imageUrl: response.image_url ?? null,
    officeId: response.office_id ?? null,
    startsAt: response.starts_at,
    title: response.title,
    updatedAt: response.updated_at,
  }
}

/** Converts the backend page envelope and every contained Info record. */
export function mapInfoPage(
  response: PaginatedResponseInfoResponse,
): PageModel<InfoRecord> {
  return mapApiPage(response, mapInfoResponse)
}

/** Converts public status entries without exposing generated snake-case fields. */
export function mapInfoStatusResponse(
  response: InfoStatusResponse,
): InfoStatusRecord {
  return {
    createdAt: response.created_at,
    id: response.id,
    message: response.message ?? null,
    status: response.status,
  }
}

/** Converts an Info image into the feature-independent media representation. */
export function mapInfoImageResponse(response: InfoImageResponse): MediaAsset {
  return {
    altText: response.alt_text,
    height: response.height ?? null,
    id: response.id,
    isCover: response.is_cover,
    mimeType: response.mime_type,
    originalFilename: response.original_filename,
    sizeBytes: response.size_bytes,
    uploadedAt: response.uploaded_at,
    url: response.url,
    width: response.width ?? null,
  }
}

function mapInfoAddress(response: AddressResponse): InfoAddress {
  return {
    city: response.city,
    houseNumber: response.house_number,
    latitude: response.latitude ?? null,
    longitude: response.longitude ?? null,
    street: response.street,
    zipCode: response.zip_code,
  }
}
