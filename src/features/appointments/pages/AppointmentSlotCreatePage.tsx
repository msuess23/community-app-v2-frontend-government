import { ArrowLeft } from 'lucide-react'

import { useAuth } from '@/auth/auth-context'
import { AppointmentSlotBatchForm } from '@/features/appointments/components/AppointmentSlotBatchForm'
import { AppointmentWorkspaceNavigation } from '@/features/appointments/components/AppointmentWorkspaceNavigation'
import { Card } from '@/shared/ui/Card'
import { LinkButton } from '@/shared/ui/LinkButton'
import { PageHeader } from '@/shared/ui/PageHeader'

/** Hosts the keyboard-operable batch workflow for new office capacity. */
export function AppointmentSlotCreatePage() {
  const { user } = useAuth()
  const officeId = user?.officeId ?? ''

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        actions={
          <LinkButton to="/appointments/slots" variant="outline">
            <ArrowLeft aria-hidden="true" size={18} />
            Zur Slotübersicht
          </LinkButton>
        }
        description="Erfasse einzelne oder mehrere zukünftige Zeitintervalle und prüfe sie vor der gemeinsamen Übermittlung."
        eyebrow="Terminslots"
        title="Terminslots anlegen"
      />

      <AppointmentWorkspaceNavigation />

      {officeId ? (
        <AppointmentSlotBatchForm officeId={officeId} />
      ) : (
        <Card padding="md" variant="subtle">
          <h2 className="text-lg font-semibold">Keine Behörde zugeordnet</h2>
          <p className="text-on-surface-variant mt-2 leading-7">
            Ohne Behördenzuordnung können keine Terminslots angelegt werden.
          </p>
        </Card>
      )}
    </div>
  )
}
