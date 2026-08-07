import { z } from 'zod'

import { isApiError } from '@/api/client/api-error'
import type { AppointmentSlotBatchCreate } from '@/api/generated/models'
import {
  isValidLocalDateTime,
  toLocalDateTimeInputValue,
  toZonedDateTimeIso,
} from '@/shared/format/local-date-time'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

export const MAX_APPOINTMENT_SLOTS_PER_BATCH = 100

export type AppointmentSlotIntervalFormValues = {
  endsAt: string
  startsAt: string
}

export type AppointmentSlotBatchFormValues = {
  slots: AppointmentSlotIntervalFormValues[]
}

const localDateTimeSchema = z
  .string()
  .min(1, 'Gib Datum und Uhrzeit an.')
  .refine(
    isValidLocalDateTime,
    'Gib ein gültiges Datum mit Uhrzeit an.',
  )

/** Creates validation for one bounded, non-overlapping future slot batch. */
export function createAppointmentSlotBatchSchema(
  nowProvider: () => Date = () => new Date(),
) {
  return z
    .object({
      slots: z
        .array(
          z.object({
            endsAt: localDateTimeSchema,
            startsAt: localDateTimeSchema,
          }),
        )
        .min(1, 'Füge mindestens einen Terminslot hinzu.')
        .max(
          MAX_APPOINTMENT_SLOTS_PER_BATCH,
          `Es können höchstens ${MAX_APPOINTMENT_SLOTS_PER_BATCH} Terminslots auf einmal angelegt werden.`,
        ),
    })
    .superRefine((values, context) => {
      const now = nowProvider().getTime()
      const validIntervals = values.slots.flatMap((slot, index) => {
        const startsAt = parseLocalDateTime(slot.startsAt)
        const endsAt = parseLocalDateTime(slot.endsAt)

        if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
          return []
        }
        if (startsAt <= now) {
          context.addIssue({
            code: 'custom',
            message: 'Der Terminslot muss in der Zukunft beginnen.',
            path: ['slots', index, 'startsAt'],
          })
        }
        if (endsAt <= startsAt) {
          context.addIssue({
            code: 'custom',
            message: 'Das Ende muss nach dem Beginn liegen.',
            path: ['slots', index, 'endsAt'],
          })
          return []
        }

        return [{ endsAt, index, startsAt }]
      })

      const ordered = [...validIntervals].sort(
        (left, right) => left.startsAt - right.startsAt,
      )

      let furthestEndingInterval = ordered[0]
      for (let index = 1; index < ordered.length; index += 1) {
        const current = ordered[index]

        if (!current || !furthestEndingInterval) {
          continue
        }
        if (current.startsAt < furthestEndingInterval.endsAt) {
          context.addIssue({
            code: 'custom',
            message:
              'Dieser Terminslot überschneidet sich mit einem anderen Eintrag im Batch.',
            path: ['slots', current.index, 'startsAt'],
          })
        }
        if (current.endsAt > furthestEndingInterval.endsAt) {
          furthestEndingInterval = current
        }
      }
    })
}

/** Creates one immediately editable row for a new batch. */
export function createEmptyAppointmentSlotBatchValues(): AppointmentSlotBatchFormValues {
  return { slots: [{ endsAt: '', startsAt: '' }] }
}

/** Converts validated local datetime inputs into timezone-aware ISO instants. */
export function toAppointmentSlotBatchCreate(
  values: AppointmentSlotBatchFormValues,
): AppointmentSlotBatchCreate {
  return {
    slots: [...values.slots]
      .sort(
        (left, right) =>
          parseLocalDateTime(left.startsAt) - parseLocalDateTime(right.startsAt),
      )
      .map((slot) => ({
        ends_at: toZonedDateTimeIso(slot.endsAt),
        starts_at: toZonedDateTimeIso(slot.startsAt),
      })),
  }
}

/** Returns valid rows in chronological order for the non-interactive preview. */
export function getAppointmentSlotBatchPreview(
  values: AppointmentSlotBatchFormValues,
): readonly Readonly<{ endsAt: string; originalIndex: number; startsAt: string }>[] {
  return values.slots
    .flatMap((slot, originalIndex) => {
      const startsAt = parseLocalDateTime(slot.startsAt)
      const endsAt = parseLocalDateTime(slot.endsAt)

      return Number.isFinite(startsAt) &&
        Number.isFinite(endsAt) &&
        endsAt > startsAt
        ? [{ endsAt: slot.endsAt, originalIndex, startsAt: slot.startsAt }]
        : []
    })
    .sort(
      (left, right) =>
        parseLocalDateTime(left.startsAt) - parseLocalDateTime(right.startsAt),
    )
}

/** Maps known backend batch failures into actionable German form feedback. */
export function getAppointmentSlotBatchSubmissionErrors(
  error: unknown,
): FormErrorSummaryItem[] {
  if (!isApiError(error)) {
    return [
      {
        message:
          'Die Terminslots konnten nicht angelegt werden. Versuche es erneut.',
      },
    ]
  }

  const messageByCode: Readonly<Record<string, string>> = {
    APPOINTMENT_SLOT_NOT_FUTURE:
      'Mindestens ein Terminslot beginnt nicht mehr in der Zukunft. Prüfe die Zeitangaben und versuche es erneut.',
    APPOINTMENT_SLOT_OVERLAP:
      'Mindestens ein Terminslot überschneidet sich mit einem bestehenden oder einem weiteren neuen Terminslot.',
    OFFICE_INACTIVE:
      'Für eine deaktivierte Behörde können keine neuen Terminslots angelegt werden.',
    OFFICE_NOT_FOUND:
      'Die zugeordnete Behörde wurde nicht gefunden oder ist nicht mehr verfügbar.',
  }
  const message = error.errorCode ? messageByCode[error.errorCode] : undefined

  return [
    {
      message:
        message ??
        'Die Terminslots konnten nicht angelegt werden. Prüfe die Angaben und versuche es erneut.',
    },
  ]
}

/** Formats the earliest useful value for a native datetime-local minimum. */
export function getMinimumLocalDateTimeValue(now = new Date()): string {
  const nextMinute = new Date(now.getTime())
  nextMinute.setSeconds(0, 0)
  nextMinute.setMinutes(nextMinute.getMinutes() + 1)

  return toLocalDateTimeInputValue(nextMinute.toISOString())
}

function parseLocalDateTime(value: string): number {
  try {
    return Date.parse(toZonedDateTimeIso(value))
  } catch {
    return Number.NaN
  }
}
