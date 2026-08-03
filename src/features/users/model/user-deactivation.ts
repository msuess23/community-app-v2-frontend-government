import { z } from 'zod'
import { getApiErrorPresentation } from '@/api/client/api-error-presentation'
import type { UserDeactivateRequest } from '@/api/generated/models'
import type { UserRecord } from '@/features/users/model/user-model'
import { changeReasonSchema, normalizeChangeReason } from '@/shared/forms/change-reason'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

export const userDeactivationSchema = z.object({
  changeReason: changeReasonSchema,
})

export type UserDeactivationFormValues = z.infer<
  typeof userDeactivationSchema
>

/** Creates the audit request expected by the administrative DELETE endpoint. */
export function toUserDeactivateRequest(
  values: UserDeactivationFormValues,
): UserDeactivateRequest {
  return {
    change_reason: normalizeChangeReason(values.changeReason),
  }
}

/** Returns role-specific consequences that must be visible before deactivation. */
export function getUserDeactivationConsequences(
  user: UserRecord,
): readonly string[] {
  const consequences = [
    'Das Konto kann sich nicht mehr anmelden und alle bestehenden Sitzungen werden beendet.',
    'Eine Reaktivierung wird vom Backend derzeit nicht unterstützt.',
  ]

  if (user.role === 'CITIZEN') {
    consequences.push(
      'E-Mail-Adresse und Name werden unmittelbar anonymisiert.',
      'Geplante Termine oder aktive Anliegen können die Deaktivierung blockieren.',
    )
  } else {
    consequences.push(
      'Aktive Anliegen, die diese Person noch benötigen, können die Deaktivierung blockieren.',
    )
  }

  return consequences
}

/** Converts lifecycle conflicts into safe, task-specific form-level messages. */
export function applyUserDeactivationError(
  error: unknown,
): FormErrorSummaryItem[] {
  const presentation = getApiErrorPresentation(error, {
    fallback: {
      description:
        'Das Konto konnte nicht deaktiviert werden. Prüfe den aktuellen Stand und versuche es erneut.',
      title: 'Deaktivierung fehlgeschlagen',
    },
    messagesByErrorCode: {
      USER_ALREADY_DEACTIVATED: {
        description: 'Das Konto wurde bereits deaktiviert.',
        title: 'Konto bereits deaktiviert',
      },
      USER_HAS_ACTIVE_TICKETS: {
        description:
          'Die Person wird noch in mindestens einem aktiven Anliegen benötigt. Löse zunächst die offene Zuständigkeit.',
        title: 'Aktive Anliegen verhindern die Deaktivierung',
      },
      USER_HAS_SCHEDULED_APPOINTMENTS: {
        description:
          'Das Bürgerkonto besitzt noch mindestens einen geplanten Termin. Bearbeite oder storniere diesen Termin zuerst.',
        title: 'Geplante Termine verhindern die Deaktivierung',
      },
    },
  })

  return [{ message: `${presentation.title}: ${presentation.description}` }]
}
