import type {
  AppointmentDocumentResponse,
  AppointmentDocumentType,
} from '@/api/generated/models'

export type { AppointmentDocumentType } from '@/api/generated/models'

export const APPOINTMENT_DOCUMENT_TYPES = [
  'CONFIRMATION',
  'FORM',
  'NOTICE',
  'PROTOCOL',
  'OTHER',
] as const satisfies readonly AppointmentDocumentType[]

export const APPOINTMENT_DOCUMENT_MIME_TYPE = 'application/pdf'
export const MAX_APPOINTMENT_DOCUMENT_BYTES = 10 * 1024 * 1024

export type AppointmentDocumentRecord = Readonly<{
  appointmentId: string
  documentGroupId: string
  documentType: AppointmentDocumentType
  id: string
  isCurrent: boolean
  mimeType: string
  originalFilename: string
  replacedVersionId: string | null
  sizeBytes: number
  uploadedAt: string
  url: string
  versionNumber: number
  visibleToCitizen: boolean
}>

const DOCUMENT_TYPE_LABELS: Readonly<
  Record<AppointmentDocumentType, string>
> = {
  CONFIRMATION: 'Bestätigung',
  FORM: 'Formular',
  NOTICE: 'Mitteilung',
  OTHER: 'Sonstiges',
  PROTOCOL: 'Protokoll',
}

/** Maps one generated immutable document version into the feature read model. */
export function mapAppointmentDocumentResponse(
  response: AppointmentDocumentResponse,
): AppointmentDocumentRecord {
  return {
    appointmentId: response.appointment_id,
    documentGroupId: response.document_group_id,
    documentType: response.document_type,
    id: response.id,
    isCurrent: response.is_current,
    mimeType: response.mime_type,
    originalFilename: response.original_filename,
    replacedVersionId: response.replaced_version_id ?? null,
    sizeBytes: response.size_bytes,
    uploadedAt: response.uploaded_at,
    url: response.url,
    versionNumber: response.version_number,
    visibleToCitizen: response.visible_to_citizen,
  }
}

/** Maps and deterministically orders current document groups by upload time. */
export function mapCurrentAppointmentDocuments(
  responses: readonly AppointmentDocumentResponse[],
): readonly AppointmentDocumentRecord[] {
  return responses
    .map(mapAppointmentDocumentResponse)
    .sort((left, right) => {
      const uploadedComparison =
        Date.parse(left.uploadedAt) - Date.parse(right.uploadedAt)
      return uploadedComparison || left.id.localeCompare(right.id)
    })
}

/** Maps retained versions and keeps the newest version first. */
export function mapAppointmentDocumentVersions(
  responses: readonly AppointmentDocumentResponse[],
): readonly AppointmentDocumentRecord[] {
  return responses
    .map(mapAppointmentDocumentResponse)
    .sort(
      (left, right) =>
        right.versionNumber - left.versionNumber ||
        right.id.localeCompare(left.id),
    )
}

/** Localizes one controlled document type without changing its API value. */
export function getAppointmentDocumentTypeLabel(
  documentType: AppointmentDocumentType,
): string {
  return DOCUMENT_TYPE_LABELS[documentType]
}

/** Builds a concise label for selectors and accessible document actions. */
export function getAppointmentDocumentLabel(
  document: AppointmentDocumentRecord,
): string {
  return `${getAppointmentDocumentTypeLabel(document.documentType)} – ${document.originalFilename}`
}
