import { Ban } from 'lucide-react'

import { getApiErrorPresentation } from '@/api/client/api-error-presentation'
import {
  canDeactivateAppointmentSlot,
  type AppointmentSlotRecord,
} from '@/features/appointments/model/appointment-slot-model'
import { useDeactivateAppointmentSlotMutation } from '@/features/appointments/queries/appointment-slot-queries'
import { useConfirmation } from '@/shared/confirmation/confirmation-context'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import { Button } from '@/shared/ui/Button'

const DEACTIVATION_ERROR_MESSAGES = {
  APPOINTMENT_SLOT_IN_PAST: {
    description:
      'Der Terminslot liegt inzwischen in der Vergangenheit und kann nicht mehr deaktiviert werden.',
    title: 'Terminslot bereits verstrichen',
  },
  APPOINTMENT_SLOT_NOT_AVAILABLE: {
    description:
      'Der Terminslot ist nicht mehr frei. Die Slotliste wurde aktualisiert.',
    title: 'Terminslot nicht mehr verfügbar',
  },
  APPOINTMENT_SLOT_NOT_FOUND: {
    description:
      'Der Terminslot wurde nicht gefunden oder gehört nicht mehr zu deiner Behörde.',
    title: 'Terminslot nicht verfügbar',
  },
} as const

/** Confirms and executes the non-destructive deactivation of one future free slot. */
export function AppointmentSlotDeactivationButton({
  slot,
}: Readonly<{ slot: AppointmentSlotRecord }>) {
  const { confirm } = useConfirmation()
  const { notify } = useFeedback()
  const mutation = useDeactivateAppointmentSlotMutation()

  if (!canDeactivateAppointmentSlot(slot)) {
    return (
      <span className="text-on-surface-variant text-sm">Keine Aktion</span>
    )
  }

  return (
    <Button
      aria-label={`Terminslot am ${formatDisplayDateTime(slot.startsAt)} deaktivieren`}
      isDisabled={mutation.isPending}
      onPress={async () => {
        const accepted = await confirm({
          cancelLabel: 'Terminslot behalten',
          confirmLabel: 'Terminslot deaktivieren',
          description: `Der freie Terminslot am ${formatDisplayDateTime(
            slot.startsAt,
          )} wird für Bürger nicht mehr buchbar sein. Er bleibt aus Nachvollziehbarkeitsgründen erhalten.`,
          initialFocus: 'cancel',
          title: 'Terminslot deaktivieren?',
          tone: 'danger',
        })

        if (!accepted) {
          return
        }

        try {
          await mutation.mutateAsync({
            officeId: slot.officeId,
            slotId: slot.id,
          })
          notify({
            dedupeKey: `appointment-slot-deactivated:${slot.id}`,
            description:
              'Der Terminslot bleibt in der Übersicht erhalten und ist nicht mehr buchbar.',
            title: 'Terminslot deaktiviert',
            tone: 'success',
          })
        } catch (error) {
          const presentation = getApiErrorPresentation(error, {
            fallback: {
              description:
                'Der Terminslot konnte nicht deaktiviert werden. Versuche es erneut.',
              title: 'Deaktivierung fehlgeschlagen',
            },
            messagesByErrorCode: DEACTIVATION_ERROR_MESSAGES,
          })
          notify({ ...presentation, tone: 'error' })
        }
      }}
      size="sm"
      type="button"
      variant="outline"
    >
      <Ban aria-hidden="true" size={16} />
      {mutation.isPending ? 'Wird deaktiviert …' : 'Deaktivieren'}
    </Button>
  )
}
