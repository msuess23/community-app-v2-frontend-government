import type { UseFormSetError } from 'react-hook-form'
import { z } from 'zod'

import { isApiError } from '@/api/client/api-error'
import { getApiErrorPresentation } from '@/api/client/api-error-presentation'
import type { BodyUploadAppointmentDocumentApiV1AppointmentsAppointmentIdDocumentsPost } from '@/api/generated/models'
import {
  APPOINTMENT_DOCUMENT_MIME_TYPE,
  APPOINTMENT_DOCUMENT_TYPES,
  MAX_APPOINTMENT_DOCUMENT_BYTES,
  type AppointmentDocumentRecord,
  type AppointmentDocumentType,
} from '@/features/appointments/model/appointment-document'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

export type AppointmentDocumentUploadMode = 'NEW' | 'REPLACE'

export type AppointmentDocumentUploadFormValues = {
  documentGroupId: string
  documentType: AppointmentDocumentType
  files: File[]
  mode: AppointmentDocumentUploadMode
  visibleToCitizen: boolean
}

/** Accepts browser File objects independently of the JavaScript realm that created them. */
function isFileLike(value: unknown): value is File {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<File>
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.lastModified === 'number' &&
    typeof candidate.size === 'number' &&
    typeof candidate.type === 'string' &&
    typeof candidate.slice === 'function'
  )
}

const documentFileSchema = z
  .array(
    z.custom<File>(isFileLike, {
      message: 'Wähle eine gültige Datei aus.',
    }),
  )
  .length(1, 'Wähle genau eine PDF-Datei aus.')
  .superRefine((files, context) => {
    const file = files[0]
    if (!file) return

    if (file.size === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Die PDF-Datei darf nicht leer sein.',
      })
    }
    if (file.size > MAX_APPOINTMENT_DOCUMENT_BYTES) {
      context.addIssue({
        code: 'custom',
        message: 'Die PDF-Datei darf höchstens 10 MiB groß sein.',
      })
    }
    if (
      file.type !== APPOINTMENT_DOCUMENT_MIME_TYPE ||
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Wähle eine PDF-Datei mit der Endung .pdf aus.',
      })
    }
  })

export const appointmentDocumentUploadSchema = z
  .object({
    documentGroupId: z.string(),
    documentType: z.enum(APPOINTMENT_DOCUMENT_TYPES),
    files: documentFileSchema,
    mode: z.enum(['NEW', 'REPLACE']),
    visibleToCitizen: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.mode === 'REPLACE' && !values.documentGroupId) {
      context.addIssue({
        code: 'custom',
        message: 'Wähle die Dokumentgruppe aus, die ersetzt werden soll.',
        path: ['documentGroupId'],
      })
    }
  })

/** Creates stable defaults for a new immutable document group. */
export function createAppointmentDocumentUploadDefaults(): AppointmentDocumentUploadFormValues {
  return {
    documentGroupId: '',
    documentType: 'CONFIRMATION',
    files: [],
    mode: 'NEW',
    visibleToCitizen: false,
  }
}

/** Applies the selected immutable group metadata when replacement mode changes. */
export function getReplacementDocumentType(
  documentGroupId: string,
  currentDocuments: readonly AppointmentDocumentRecord[],
): AppointmentDocumentType | null {
  return (
    currentDocuments.find(
      (document) => document.documentGroupId === documentGroupId,
    )?.documentType ?? null
  )
}

/** Converts validated local upload values into the generated multipart request. */
export function toAppointmentDocumentUploadRequest(
  values: AppointmentDocumentUploadFormValues,
): BodyUploadAppointmentDocumentApiV1AppointmentsAppointmentIdDocumentsPost {
  const file = values.files[0]
  if (!file) {
    throw new Error('A validated appointment document upload requires one file.')
  }

  return {
    document_type: values.documentType,
    file,
    replace_document_group_id:
      values.mode === 'REPLACE' ? values.documentGroupId : null,
    visible_to_citizen: values.visibleToCitizen,
  }
}

export const APPOINTMENT_DOCUMENT_ERROR_MESSAGES = {
  APPOINTMENT_DOCUMENT_FILE_NOT_FOUND: {
    description:
      'Die gespeicherte PDF-Datei ist nicht mehr verfügbar. Die Dokumentdaten wurden neu geladen.',
    title: 'Dokumentdatei nicht verfügbar',
  },
  APPOINTMENT_DOCUMENT_GROUP_NOT_FOUND: {
    description:
      'Die ausgewählte Dokumentgruppe wurde zwischenzeitlich geändert oder entfernt.',
    title: 'Dokumentgruppe nicht verfügbar',
  },
  APPOINTMENT_DOCUMENT_NOT_FOUND: {
    description:
      'Die Dokumentversion wurde nicht gefunden oder liegt außerhalb deines Zuständigkeitsbereichs.',
    title: 'Dokument nicht verfügbar',
  },
  APPOINTMENT_DOCUMENT_TOO_LARGE: {
    description: 'Die PDF-Datei überschreitet die zulässige Größe von 10 MiB.',
    title: 'PDF-Datei zu groß',
  },
  APPOINTMENT_DOCUMENT_TYPE_MISMATCH: {
    description:
      'Eine neue Version muss denselben Dokumenttyp wie die bestehende Dokumentgruppe verwenden.',
    title: 'Dokumenttyp passt nicht',
  },
  APPOINTMENT_NOT_FOUND: {
    description:
      'Der Termin wurde entfernt oder liegt nicht mehr im Zuständigkeitsbereich deiner Behörde.',
    title: 'Termin nicht verfügbar',
  },
  APPOINTMENT_PROJECTION_VERSION_MISMATCH: {
    description:
      'Der gespeicherte Terminstand ist vorübergehend inkonsistent. Das Dokument wurde nicht hochgeladen.',
    title: 'Terminstand muss geprüft werden',
  },
  EMPTY_APPOINTMENT_DOCUMENT: {
    description: 'Die ausgewählte PDF-Datei enthält keine Daten.',
    title: 'PDF-Datei ist leer',
  },
  INVALID_APPOINTMENT_DOCUMENT_CONTENT: {
    description:
      'Die ausgewählte Datei besitzt keinen gültigen PDF-Inhalt. Wähle eine andere PDF-Datei aus.',
    title: 'PDF-Datei nicht gültig',
  },
  UNSUPPORTED_APPOINTMENT_DOCUMENT_TYPE: {
    description: 'Es können ausschließlich PDF-Dateien hochgeladen werden.',
    title: 'Dateityp nicht unterstützt',
  },
} as const

/** Converts upload and download failures into stable localized feedback. */
export function getAppointmentDocumentErrorPresentation(error: unknown) {
  return getApiErrorPresentation(error, {
    fallback: {
      description:
        'Die Dokumentaktion konnte nicht abgeschlossen werden. Lade den aktuellen Stand und versuche es erneut.',
      title: 'Dokumentaktion fehlgeschlagen',
    },
    messagesByErrorCode: APPOINTMENT_DOCUMENT_ERROR_MESSAGES,
  })
}

/** Maps generated validation details to the upload form and summarizes domain failures. */
export function applyAppointmentDocumentSubmissionError(
  error: unknown,
  setError: UseFormSetError<AppointmentDocumentUploadFormValues>,
): FormErrorSummaryItem[] {
  if (isApiError(error)) {
    let mapped = false
    let unmapped = false

    for (const detail of error.details) {
      const field = detail.field?.replace(/^body\./, '')
      switch (field) {
        case 'document_type':
          mapped = true
          setError('documentType', {
            message: 'Wähle einen gültigen Dokumenttyp aus.',
            type: 'server',
          })
          break
        case 'file':
          mapped = true
          setError('files', {
            message: 'Wähle eine gültige PDF-Datei aus.',
            type: 'server',
          })
          break
        case 'replace_document_group_id':
          mapped = true
          setError('documentGroupId', {
            message: 'Wähle eine gültige bestehende Dokumentgruppe aus.',
            type: 'server',
          })
          break
        case 'visible_to_citizen':
          mapped = true
          setError('visibleToCitizen', {
            message: 'Die Bürgerfreigabe konnte nicht verarbeitet werden.',
            type: 'server',
          })
          break
        default:
          unmapped = true
      }
    }

    if (mapped && !unmapped) return []
  }

  const presentation = getAppointmentDocumentErrorPresentation(error)
  return [{ message: `${presentation.title}: ${presentation.description}` }]
}
