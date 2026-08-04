import { z } from 'zod'

import { isApiError } from '@/api/client/api-error'
import { getApiErrorPresentation } from '@/api/client/api-error-presentation'
import type { OfficeDeactivateRequest } from '@/api/generated/models'
import {
  changeReasonSchema,
  normalizeChangeReason,
} from '@/shared/forms/change-reason'

export const officeDeactivationSchema = z.object({
  changeReason: changeReasonSchema,
})

export type OfficeDeactivationFormValues = z.infer<
  typeof officeDeactivationSchema
>

export type OfficeDeactivationErrorPresentation = Readonly<{
  description: string
  errorCode?: string
  title: string
}>

/** Creates the audit request expected by the administrative DELETE endpoint. */
export function toOfficeDeactivateRequest(
  values: OfficeDeactivationFormValues,
): OfficeDeactivateRequest {
  return {
    change_reason: normalizeChangeReason(values.changeReason),
  }
}

/** Returns the irreversible consequences that must be visible before deactivation. */
export function getOfficeDeactivationConsequences(): readonly string[] {
  return [
    'Die Behörde verschwindet aus allen normalen Listen mit aktiven Behörden.',
    'Sie kann keinen neuen Benutzerkonten mehr zugeordnet und nicht weiter bearbeitet werden.',
    'Eine Reaktivierung wird vom Backend derzeit nicht unterstützt.',
    'Aktive Benutzerzuordnungen, aktive Anliegen oder bestehende Terminverpflichtungen können die Deaktivierung blockieren.',
  ]
}

/** Converts lifecycle conflicts into safe, task-specific feedback. */
export function getOfficeDeactivationError(
  error: unknown,
): OfficeDeactivationErrorPresentation {
  const presentation = getApiErrorPresentation(error, {
    fallback: {
      description:
        'Die Behörde konnte nicht deaktiviert werden. Prüfe den aktuellen Stand und versuche es erneut.',
      title: 'Deaktivierung fehlgeschlagen',
    },
    messagesByErrorCode: {
      OFFICE_ALREADY_DEACTIVATED: {
        description: 'Die Behörde wurde bereits deaktiviert.',
        title: 'Behörde bereits deaktiviert',
      },
      OFFICE_HAS_ACTIVE_TICKETS: {
        description:
          'Mindestens ein aktives Anliegen ist dieser Behörde noch zugeordnet. Schließe oder übertrage die offenen Anliegen zuerst.',
        title: 'Aktive Anliegen verhindern die Deaktivierung',
      },
      OFFICE_HAS_ACTIVE_USERS: {
        description:
          'Mindestens ein aktives Benutzerkonto ist dieser Behörde noch zugeordnet. Ändere oder deaktiviere diese Zuordnungen zuerst.',
        title: 'Aktive Benutzer verhindern die Deaktivierung',
      },
      OFFICE_HAS_APPOINTMENT_COMMITMENTS: {
        description:
          'Für die Behörde bestehen noch Terminverpflichtungen. Bearbeite oder storniere die betroffenen Termine zuerst.',
        title: 'Terminverpflichtungen verhindern die Deaktivierung',
      },
      OFFICE_NOT_FOUND: {
        description:
          'Die Behörde wurde nicht gefunden oder ist nicht mehr verfügbar.',
        title: 'Behörde nicht verfügbar',
      },
    },
  })

  return {
    ...presentation,
    errorCode: isApiError(error) ? error.errorCode : undefined,
  }
}
