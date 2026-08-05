import { formatDisplayFileSize } from '@/shared/format/display-values'
import type {
  MediaUploadItem,
  MediaUploadValidationOptions,
} from '@/shared/media/media-upload-model'

/** Normalizes optional user-authored media descriptions before validation and upload. */
export function normalizeMediaDescription(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/** Applies feature-provided file and description constraints to one queue item. */
export function validateMediaUploadItem(
  item: MediaUploadItem,
  options: MediaUploadValidationOptions,
): string | null {
  if (
    options.allowedMimeTypes &&
    !options.allowedMimeTypes.includes(item.file.type)
  ) {
    return 'Dieser Dateityp wird nicht unterstützt.'
  }

  if (item.file.size === 0) {
    return 'Die ausgewählte Datei ist leer.'
  }

  if (options.maxBytes !== undefined && item.file.size > options.maxBytes) {
    return `Die Datei darf höchstens ${formatDisplayFileSize(options.maxBytes)} groß sein.`
  }

  const normalizedDescription = normalizeMediaDescription(item.description)

  if (options.descriptionField?.required && !normalizedDescription) {
    return `${options.descriptionField.label} ist erforderlich.`
  }

  if (
    options.descriptionField?.maxLength !== undefined &&
    normalizedDescription.length > options.descriptionField.maxLength
  ) {
    return `${options.descriptionField.label} darf höchstens ${options.descriptionField.maxLength} Zeichen enthalten.`
  }

  return null
}

/** Creates the concise live-region announcement for the current queue state. */
export function createMediaQueueAnnouncement({
  failedCount,
  pendingCount,
  uploadedCount,
}: Readonly<{
  failedCount: number
  pendingCount: number
  uploadedCount: number
}>): string {
  return `Upload-Warteschlange: ${uploadedCount} hochgeladen, ${failedCount} fehlgeschlagen, ${pendingCount} ausstehend.`
}
