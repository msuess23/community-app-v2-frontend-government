import { Ban, CircleCheckBig, RefreshCw, UserX } from 'lucide-react'
import { useMemo } from 'react'

import { AppointmentLifecycleForm } from '@/features/appointments/components/AppointmentLifecycleForms'
import type { AppointmentAction } from '@/features/appointments/model/appointment-lifecycle'
import type { AppointmentRecord } from '@/features/appointments/model/appointment-model'
import { ResourceActionBar } from '@/shared/resource-detail/ResourceActionBar'
import { createResourceActionRegistry } from '@/shared/resource-detail/resource-action-registry'

/** Renders exactly the appointment commands exposed by the current projection. */
export function AppointmentLifecycleActions({
  appointment,
}: Readonly<{ appointment: AppointmentRecord }>) {
  const registry = useMemo(
    () =>
      createResourceActionRegistry<AppointmentAction>([
        {
          action: 'RESCHEDULE',
          description:
            'Wähle einen freien zukünftigen Terminslot derselben Behörde. Der bisherige Slot wird erst nach erfolgreicher Serverbestätigung freigegeben.',
          dialogTitle: 'Termin verschieben',
          icon: <RefreshCw aria-hidden="true" size={18} />,
          label: 'Verschieben',
          render: ({ action }) => (
            <AppointmentLifecycleForm
              action={action}
              appointment={appointment}
            />
          ),
        },
        {
          action: 'CANCEL',
          buttonVariant: 'danger',
          description:
            'Storniere den zukünftigen Termin mit Begründung. Der aktuell gebuchte Terminslot wird anschließend wieder freigegeben.',
          dialogTitle: 'Termin stornieren',
          icon: <Ban aria-hidden="true" size={18} />,
          label: 'Stornieren',
          render: ({ action }) => (
            <AppointmentLifecycleForm
              action={action}
              appointment={appointment}
            />
          ),
        },
        {
          action: 'COMPLETE',
          description:
            'Dokumentiere nach Terminbeginn die Durchführung. Der Termin erhält einen terminalen Zustand und der Slot wird verbraucht.',
          dialogTitle: 'Termin abschließen',
          icon: <CircleCheckBig aria-hidden="true" size={18} />,
          label: 'Abschließen',
          render: ({ action }) => (
            <AppointmentLifecycleForm
              action={action}
              appointment={appointment}
            />
          ),
        },
        {
          action: 'MARK_NO_SHOW',
          buttonVariant: 'danger',
          description:
            'Dokumentiere nach Terminbeginn, dass der Bürger nicht erschienen ist. Diese Aktion beendet den Termin endgültig.',
          dialogTitle: 'Nichterscheinen dokumentieren',
          icon: <UserX aria-hidden="true" size={18} />,
          label: 'Nicht erschienen',
          render: ({ action }) => (
            <AppointmentLifecycleForm
              action={action}
              appointment={appointment}
            />
          ),
        },
      ]),
    [appointment],
  )

  return (
    <ResourceActionBar
      allowedActions={appointment.allowedActions}
      ariaLabel="Verfügbare Terminaktionen"
      emptyMessage="Für diesen Terminstand sind keine weiteren Aktionen verfügbar."
      registry={registry}
    />
  )
}
