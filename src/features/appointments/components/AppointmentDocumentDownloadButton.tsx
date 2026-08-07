import { Download } from 'lucide-react'

import {
  getAppointmentDocumentLabel,
  type AppointmentDocumentRecord,
} from '@/features/appointments/model/appointment-document'
import { useDownloadAppointmentDocumentMutation } from '@/features/appointments/queries/appointment-document-queries'
import { Button } from '@/shared/ui/Button'

/** Downloads one immutable PDF through the authenticated API transport. */
export function AppointmentDocumentDownloadButton({
  appointmentId,
  document,
}: Readonly<{
  appointmentId: string
  document: AppointmentDocumentRecord
}>) {
  const mutation = useDownloadAppointmentDocumentMutation()
  const isPending =
    mutation.isPending && mutation.variables?.document.id === document.id

  return (
    <Button
      aria-label={`${getAppointmentDocumentLabel(document)}, Version ${document.versionNumber} herunterladen`}
      isDisabled={isPending}
      onPress={() => mutation.mutate({ appointmentId, document })}
      size="sm"
      variant="outline"
    >
      <Download aria-hidden="true" size={16} />
      {isPending ? 'Wird geladen …' : 'Herunterladen'}
    </Button>
  )
}
