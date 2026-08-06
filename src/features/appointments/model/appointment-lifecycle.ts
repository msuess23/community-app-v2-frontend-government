import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'
import { z } from 'zod'

import { isApiError } from '@/api/client/api-error'
import { getApiErrorPresentation } from '@/api/client/api-error-presentation'
import type {
  AppointmentAction,
  AppointmentCancelRequest,
  AppointmentCompleteRequest,
  AppointmentNoShowRequest,
  AppointmentRescheduleRequest,
} from '@/api/generated/models'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

export type { AppointmentAction } from '@/api/generated/models'

export const ALL_APPOINTMENT_ACTIONS = [
  'RESCHEDULE',
  'CANCEL',
  'COMPLETE',
  'MARK_NO_SHOW',
] as const satisfies readonly AppointmentAction[]

const requiredReasonSchema = z
  .string()
  .trim()
  .min(3, 'Die Begründung muss mindestens 3 Zeichen enthalten.')
  .max(500, 'Die Begründung darf höchstens 500 Zeichen haben.')
const optionalCommentSchema = z
  .string()
  .trim()
  .max(1000, 'Die interne Notiz darf höchstens 1000 Zeichen haben.')

export const rescheduleAppointmentSchema = z.object({
  reason: requiredReasonSchema,
  targetSlotId: z.string().trim().min(1, 'Wähle einen neuen Terminslot aus.'),
})
export const cancelAppointmentSchema = z.object({ reason: requiredReasonSchema })
export const completeAppointmentSchema = z.object({
  comment: optionalCommentSchema,
})
export const markAppointmentNoShowSchema = z.object({
  comment: optionalCommentSchema,
})

export type RescheduleAppointmentFormValues = z.infer<
  typeof rescheduleAppointmentSchema
>
export type CancelAppointmentFormValues = z.infer<typeof cancelAppointmentSchema>
export type CompleteAppointmentFormValues = z.infer<
  typeof completeAppointmentSchema
>
export type MarkAppointmentNoShowFormValues = z.infer<
  typeof markAppointmentNoShowSchema
>

export const APPOINTMENT_LIFECYCLE_ERROR_MESSAGES = {
  APPOINTMENT_ALREADY_STARTED: {
    description:
      'Der Termin hat bereits begonnen. Die Terminplanung wurde neu geladen.',
    title: 'Termin hat bereits begonnen',
  },
  APPOINTMENT_NOT_FOUND: {
    description:
      'Der Termin wurde entfernt oder liegt nicht mehr in deinem Zuständigkeitsbereich.',
    title: 'Termin nicht verfügbar',
  },
  APPOINTMENT_NOT_SCHEDULED: {
    description:
      'Die Aktion ist nur für einen geplanten Termin möglich. Der aktuelle Terminstand wurde neu geladen.',
    title: 'Aktion nicht mehr verfügbar',
  },
  APPOINTMENT_NOT_STARTED: {
    description:
      'Der Termin hat noch nicht begonnen und kann deshalb noch nicht abgeschlossen werden.',
    title: 'Termin noch nicht begonnen',
  },
  APPOINTMENT_PROJECTION_VERSION_MISMATCH: {
    description:
      'Der gespeicherte Terminstand ist vorübergehend inkonsistent. Es wurde keine Aktion ausgeführt.',
    title: 'Terminstand muss geprüft werden',
  },
  APPOINTMENT_SLOT_IN_PAST: {
    description:
      'Der ausgewählte Terminslot liegt inzwischen in der Vergangenheit. Die Auswahl wurde aktualisiert.',
    title: 'Terminslot verstrichen',
  },
  APPOINTMENT_SLOT_MISSING: {
    description:
      'Dem Termin ist kein gültiger aktueller Terminslot mehr zugeordnet. Es wurde keine Aktion ausgeführt.',
    title: 'Aktueller Terminslot fehlt',
  },
  APPOINTMENT_SLOT_NOT_AVAILABLE: {
    description:
      'Der ausgewählte Terminslot ist nicht mehr verfügbar. Die Auswahl wurde aktualisiert.',
    title: 'Terminslot nicht mehr verfügbar',
  },
  APPOINTMENT_SLOT_NOT_FOUND: {
    description:
      'Der ausgewählte Terminslot wurde entfernt oder ist nicht mehr sichtbar. Die Auswahl wurde aktualisiert.',
    title: 'Terminslot nicht verfügbar',
  },
  APPOINTMENT_SLOT_OFFICE_MISMATCH: {
    description:
      'Der ausgewählte Terminslot gehört nicht zur zuständigen Behörde.',
    title: 'Terminslot nicht zulässig',
  },
  APPOINTMENT_SLOT_STATE_INVALID: {
    description:
      'Der Zustand des bisherigen Terminslots hat sich geändert. Der Terminstand wurde neu geladen.',
    title: 'Terminslotzustand geändert',
  },
  APPOINTMENT_SLOT_UNCHANGED: {
    description: 'Wähle einen anderen Terminslot als den aktuell zugeordneten.',
    title: 'Terminslot unverändert',
  },
} as const

export function toAppointmentRescheduleRequest(
  values: RescheduleAppointmentFormValues,
): AppointmentRescheduleRequest {
  return {
    reason: normalizeRequiredText(values.reason),
    target_slot_id: values.targetSlotId,
  }
}

export function toAppointmentCancelRequest(
  values: CancelAppointmentFormValues,
): AppointmentCancelRequest {
  return { reason: normalizeRequiredText(values.reason) }
}

export function toAppointmentCompleteRequest(
  values: CompleteAppointmentFormValues,
): AppointmentCompleteRequest {
  return { comment: normalizeOptionalText(values.comment) }
}

export function toAppointmentNoShowRequest(
  values: MarkAppointmentNoShowFormValues,
): AppointmentNoShowRequest {
  return { comment: normalizeOptionalText(values.comment) }
}

/** Converts lifecycle failures into stable localized dialog and toast feedback. */
export function getAppointmentLifecycleErrorPresentation(error: unknown) {
  return getApiErrorPresentation(error, {
    fallback: {
      description:
        'Die Terminaktion konnte nicht abgeschlossen werden. Lade den aktuellen Stand und versuche es erneut.',
      title: 'Terminaktion fehlgeschlagen',
    },
    messagesByErrorCode: APPOINTMENT_LIFECYCLE_ERROR_MESSAGES,
  })
}

/** Maps backend field details to the active form and safely summarizes the remainder. */
export function applyAppointmentLifecycleSubmissionError<
  TValues extends FieldValues,
>(
  error: unknown,
  setError: UseFormSetError<TValues>,
  aliases: Readonly<Record<string, FieldPath<TValues>>>,
): FormErrorSummaryItem[] {
  if (isApiError(error)) {
    let mapped = false
    let unmapped = false

    for (const detail of error.details) {
      const rawField = detail.field?.replace(/^body\./, '')
      if (!rawField) {
        unmapped = true
        continue
      }

      const field = aliases[rawField]
      if (!field) {
        unmapped = true
        continue
      }

      mapped = true
      setError(field, {
        message: getAppointmentLifecycleFieldErrorMessage(rawField),
        type: 'server',
      })
    }

    if (mapped && !unmapped) {
      return []
    }
  }

  const presentation = getAppointmentLifecycleErrorPresentation(error)
  return [{ message: `${presentation.title}: ${presentation.description}` }]
}

function getAppointmentLifecycleFieldErrorMessage(field: string): string {
  if (field === 'target_slot_id') {
    return 'Wähle einen gültigen neuen Terminslot aus.'
  }
  if (field === 'reason') {
    return 'Die Begründung muss 3 bis 500 Zeichen enthalten.'
  }
  return 'Die interne Notiz darf höchstens 1000 Zeichen haben.'
}

function normalizeRequiredText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeOptionalText(value: string): string | null {
  return normalizeRequiredText(value) || null
}
