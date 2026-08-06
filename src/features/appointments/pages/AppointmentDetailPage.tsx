import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router'

import { AppointmentDetailSummary } from '@/features/appointments/components/AppointmentDetailSummary'
import { AppointmentDocuments } from '@/features/appointments/components/AppointmentDocuments'
import { AppointmentEventTimeline } from '@/features/appointments/components/AppointmentEventTimeline'
import { AppointmentStatusBadge } from '@/features/appointments/components/AppointmentStatusBadge'
import { APPOINTMENT_READ_ERROR_MESSAGES } from '@/features/appointments/model/appointment-error-messages'
import { createAppointmentDetailQueryOptions } from '@/features/appointments/queries/appointment-queries'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import {
  ResourceDetailLayout,
  ResourceDetailSection,
  ResourceMetadataList,
} from '@/shared/resource-detail/ResourceDetailLayout'
import { resolveResourceDetailReturnTo } from '@/shared/resource-detail/detail-navigation'

const DETAIL_NAVIGATION = [
  { id: 'lifecycle-actions', label: 'Aktionen' },
  { id: 'appointment', label: 'Termin' },
  { id: 'concern', label: 'Anliegen' },
  { id: 'linked-ticket', label: 'Ticket' },
  { id: 'documents', label: 'Dokumente' },
  { id: 'event-history', label: 'Ereignishistorie' },
  { id: 'responsibility', label: 'Beteiligte' },
  { id: 'metadata', label: 'Metadaten' },
] as const

/** Shows the current server-owned appointment projection without replaying events. */
export function AppointmentDetailPage() {
  const { appointmentId = '' } = useParams()
  const location = useLocation()
  const appointmentQuery = useQuery({
    ...createAppointmentDetailQueryOptions(appointmentId),
    enabled: appointmentId.length > 0,
  })
  const returnTo = resolveResourceDetailReturnTo(
    location.state,
    '/appointments',
  )

  return (
    <RemoteDataBoundary
      errorOptions={{
        fallback: {
          description:
            'Der Termin konnte nicht geladen werden. Versuche es erneut.',
          title: 'Termin nicht verfügbar',
        },
        messagesByErrorCode: APPOINTMENT_READ_ERROR_MESSAGES,
      }}
      loadingLabel="Termin wird geladen."
      query={appointmentQuery}
    >
      {(appointment) => (
        <ResourceDetailLayout
          aside={<AppointmentDetailSummary appointment={appointment} />}
          backLink={{ label: 'Zurück zum Terminverzeichnis', to: returnTo }}
          description="Aktueller, vom Backend berechneter Planungsstand des Termins."
          eyebrow="Termin der eigenen Behörde"
          navigationClassName="xl:hidden"
          navigationItems={DETAIL_NAVIGATION}
          status={
            <div>
              <AppointmentStatusBadge status={appointment.status} />
              <p
                aria-label="Aktueller Terminstand"
                aria-live="polite"
                className="sr-only"
                role="status"
              >
                Terminstand Version {appointment.version}, zuletzt geändert{' '}
                {formatDisplayDateTime(appointment.updatedAt)}.
              </p>
            </div>
          }
          title={`Termin mit ${appointment.citizen.displayName}`}
        >
          <ResourceDetailSection id="appointment" title="Terminplanung">
            <ResourceMetadataList
              items={[
                {
                  label: 'Beginn',
                  value: (
                    <time dateTime={appointment.startsAt}>
                      {formatDisplayDateTime(appointment.startsAt)}
                    </time>
                  ),
                },
                {
                  label: 'Ende',
                  value: (
                    <time dateTime={appointment.endsAt}>
                      {formatDisplayDateTime(appointment.endsAt)}
                    </time>
                  ),
                },
                {
                  label: 'Aktueller Slot',
                  value: appointment.currentSlotId
                    ? 'Terminplatz zugeordnet'
                    : 'Kein aktueller Terminplatz',
                },
              ]}
            />
          </ResourceDetailSection>

          <ResourceDetailSection id="concern" title="Anliegen">
            <p className="text-on-surface-variant whitespace-pre-wrap leading-7">
              {appointment.reason ?? 'Kein Anliegen hinterlegt.'}
            </p>
          </ResourceDetailSection>

          <ResourceDetailSection
            description="Ein Termin kann mit einem Bürger-Ticket derselben Behörde verknüpft sein. Der Link erscheint nur, wenn das Backend den aktuellen Ticketzugriff bestätigt."
            id="linked-ticket"
            title="Verknüpftes Ticket"
          >
            {appointment.ticket ? (
              appointment.ticket.canView ? (
                <Link
                  className="text-primary focus-visible:outline-primary inline-flex min-h-11 items-center rounded-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
                  to={`/tickets/${appointment.ticket.id}`}
                >
                  {appointment.ticket.title}
                </Link>
              ) : (
                <div className="space-y-2">
                  <p>{appointment.ticket.title}</p>
                  <p className="text-on-surface-variant text-sm leading-6">
                    Das verknüpfte Ticket liegt außerhalb deiner aktuellen
                    Ticketzuständigkeit und kann daher nicht geöffnet werden.
                  </p>
                </div>
              )
            ) : (
              <p className="text-on-surface-variant">
                Dieser Termin ist mit keinem Ticket verknüpft.
              </p>
            )}
          </ResourceDetailSection>

          <ResourceDetailSection
            description="Aktuelle PDF-Dokumentgruppen und ihre unveränderlichen Versionen. Ältere Versionen bleiben für die Behörde abrufbar."
            id="documents"
            title="Termindokumente"
          >
            <AppointmentDocuments appointmentId={appointment.id} />
          </ResourceDetailSection>

          <ResourceDetailSection
            description="Unveränderliche Ereignisse mit dem neuesten Eintrag zuerst. Der aktuelle Terminstand oben wird weiterhin direkt aus der Backend-Projektion gelesen."
            id="event-history"
            title="Ereignishistorie"
          >
            <AppointmentEventTimeline appointmentId={appointment.id} />
          </ResourceDetailSection>
        </ResourceDetailLayout>
      )}
    </RemoteDataBoundary>
  )
}
