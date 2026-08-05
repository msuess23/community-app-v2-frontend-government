import type { FieldPath, UseFormSetError } from 'react-hook-form'
import { z } from 'zod'

import { isApiError } from '@/api/client/api-error'
import { getApiErrorPresentation } from '@/api/client/api-error-presentation'
import type {
  InfoStatus,
  InfoStatusCreateRequest,
} from '@/api/generated/models'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

export const INFO_STATUS_VALUES = [
  'SCHEDULED',
  'ACTIVE',
  'DONE',
  'CANCELLED',
] as const satisfies readonly InfoStatus[]

export const infoStatusUpdateSchema = z.object({
  message: z
    .string()
    .trim()
    .max(1000, 'Die öffentliche Nachricht darf höchstens 1000 Zeichen haben.'),
  status: z.enum(INFO_STATUS_VALUES),
})

export type InfoStatusUpdateFormValues = z.infer<
  typeof infoStatusUpdateSchema
>

/** Creates the editable values for one status action without inventing a transition rule. */
export function createInfoStatusUpdateValues(
  currentStatus: InfoStatus,
): InfoStatusUpdateFormValues {
  return { message: '', status: currentStatus }
}

/** Maps the public status form to the append-only status endpoint. */
export function toInfoStatusCreateRequest(
  values: InfoStatusUpdateFormValues,
): InfoStatusCreateRequest {
  return {
    message: normalizeOptionalText(values.message),
    status: values.status,
  }
}

/** Returns the irreversible resources removed together with one mutable Info. */
export function getInfoDeletionConsequences(): readonly string[] {
  return [
    'Die Mitteilung verschwindet dauerhaft aus dem Behörden- und Bürgerclient.',
    'Die zugehörige Adresse und der vollständige öffentliche Statusverlauf werden gelöscht.',
    'Alle hochgeladenen Bilder und Bilddateien werden endgültig entfernt.',
    'Eine Wiederherstellung oder Reaktivierung wird vom Backend nicht unterstützt.',
  ]
}

/** Maps backend status failures to fields where possible and summarizes the remainder. */
export function applyInfoStatusSubmissionError(
  error: unknown,
  setError: UseFormSetError<InfoStatusUpdateFormValues>,
): FormErrorSummaryItem[] {
  if (isApiError(error)) {
    let mappedFieldError = false
    let hasUnmappedDetail = false

    for (const detail of error.details) {
      const field = mapStatusErrorField(detail.field)
      if (!field) {
        hasUnmappedDetail = true
        continue
      }

      mappedFieldError = true
      setError(field, {
        message:
          field === 'message'
            ? 'Die öffentliche Nachricht darf höchstens 1000 Zeichen haben.'
            : 'Wähle einen gültigen Status aus.',
        type: 'server',
      })
    }

    if (mappedFieldError && !hasUnmappedDetail) {
      return []
    }
  }

  const presentation = getInfoLifecycleErrorPresentation(error, 'status')
  return [{ message: `${presentation.title}: ${presentation.description}` }]
}

/** Converts status and deletion failures into stable localized feedback. */
export function getInfoLifecycleErrorPresentation(
  error: unknown,
  action: 'delete' | 'status',
) {
  return getApiErrorPresentation(error, {
    fallback:
      action === 'delete'
        ? {
            description:
              'Die Mitteilung konnte nicht gelöscht werden. Lade den aktuellen Stand und versuche es erneut.',
            title: 'Löschen fehlgeschlagen',
          }
        : {
            description:
              'Der Status konnte nicht aktualisiert werden. Prüfe den aktuellen Stand und versuche es erneut.',
            title: 'Statusaktualisierung fehlgeschlagen',
          },
    messagesByErrorCode: {
      INFO_NOT_FOUND: {
        description:
          'Die Mitteilung wurde zwischenzeitlich gelöscht oder ist nicht mehr verfügbar.',
        title: 'Mitteilung nicht verfügbar',
      },
      INFO_STATUS_NOT_FOUND: {
        description:
          'Für diese Mitteilung fehlt der aktuelle Status. Der Datenbestand muss administrativ geprüft werden.',
        title: 'Status der Mitteilung nicht verfügbar',
      },
    },
  })
}

function mapStatusErrorField(
  rawField: string | undefined,
): FieldPath<InfoStatusUpdateFormValues> | null {
  const field = rawField?.replace(/^body\./, '')

  if (field === 'status' || field === 'message') {
    return field
  }

  return null
}

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized || null
}
