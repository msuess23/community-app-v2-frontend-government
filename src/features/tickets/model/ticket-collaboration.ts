import type {
  TicketCommentResponse,
  TicketImageResponse,
} from '@/api/generated/models'
import { getTicketUserReferenceLabel } from '@/features/tickets/model/ticket-model'
import type { MediaAsset } from '@/shared/media/media-model'

/** Represents the privacy-aware author exposed for one immutable comment. */
export type TicketCommentAuthor = Readonly<{
  authorType: 'AUTHORITY' | 'CITIZEN'
  displayName: string
  id: string | null
}>

/** Represents one public comment or internal case note reconstructed from events. */
export type TicketCommentRecord = Readonly<{
  author: TicketCommentAuthor
  createdAt: string
  id: string
  isInternal: boolean
  text: string
}>

/** Adds audit-state metadata to the shared image representation. */
export type TicketImageRecord = Readonly<{
  asset: MediaAsset
  isActive: boolean
  removedAt: string | null
}>

/** Converts one comment projection into the feature-owned read model. */
export function mapTicketCommentResponse(
  response: TicketCommentResponse,
): TicketCommentRecord {
  return {
    author: {
      authorType: response.author.author_type,
      displayName: getTicketUserReferenceLabel(response.author.display_name),
      id: response.author.id ?? null,
    },
    createdAt: response.created_at,
    id: response.id,
    isInternal: response.is_internal,
    text: response.text,
  }
}

/** Converts one current or removed ticket image into a shared gallery asset. */
export function mapTicketImageResponse(
  response: TicketImageResponse,
): TicketImageRecord {
  return {
    asset: {
      altText: null,
      height: response.height ?? null,
      id: response.id,
      isCover: response.is_cover,
      mimeType: response.mime_type,
      originalFilename: response.original_filename,
      sizeBytes: response.size_bytes,
      uploadedAt: response.uploaded_at,
      url: response.url,
      width: response.width ?? null,
    },
    isActive: response.is_active,
    removedAt: response.removed_at ?? null,
  }
}
