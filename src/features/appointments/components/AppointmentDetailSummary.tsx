import { Building2, CalendarClock, UserRound } from 'lucide-react'
import { Link } from 'react-router'

import { AppointmentLifecycleActions } from '@/features/appointments/components/AppointmentLifecycleActions'
import { AppointmentStatusBadge } from '@/features/appointments/components/AppointmentStatusBadge'
import {
  getAppointmentDurationLabel,
  type AppointmentRecord,
} from '@/features/appointments/model/appointment-model'
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatDisplayTime,
} from '@/shared/format/display-values'
import {
  ResourceDetailSection,
  ResourceMetadataList,
  type ResourceMetadataItem,
} from '@/shared/resource-detail/ResourceDetailLayout'

/** Groups server-driven actions, schedule, responsibility and metadata in the detail aside. */
export function AppointmentDetailSummary({
  appointment,
}: Readonly<{ appointment: AppointmentRecord }>) {
  const metadataItems: ResourceMetadataItem[] = [
    {
      label: 'Erstellt am',
      value: (
        <time dateTime={appointment.createdAt}>
          {formatDisplayDateTime(appointment.createdAt)}
        </time>
      ),
    },
    {
      label: 'Zuletzt geändert',
      value: (
        <time dateTime={appointment.updatedAt}>
          {formatDisplayDateTime(appointment.updatedAt)}
        </time>
      ),
    },
  ]

  if (appointment.cancelledAt) {
    metadataItems.push({
      label: 'Storniert am',
      value: (
        <time dateTime={appointment.cancelledAt}>
          {formatDisplayDateTime(appointment.cancelledAt)}
        </time>
      ),
    })
  }
  if (appointment.completedAt) {
    metadataItems.push({
      label: 'Abgeschlossen am',
      value: (
        <time dateTime={appointment.completedAt}>
          {formatDisplayDateTime(appointment.completedAt)}
        </time>
      ),
    })
  }
  metadataItems.push({ label: 'Version', value: String(appointment.version) })

  return (
    <>
      <ResourceDetailSection
        description="Das Backend berechnet die verfügbaren Aktionen aus Rolle, Behörde, Terminzeit und aktuellem Terminstatus."
        id="lifecycle-actions"
        title="Terminaktionen"
        variant="outlined"
      >
        <AppointmentLifecycleActions appointment={appointment} />
      </ResourceDetailSection>

      <ResourceDetailSection
        id="schedule-summary"
        title="Terminübersicht"
        variant="outlined"
      >
        <div className="flex gap-2">
          <CalendarClock
            aria-hidden="true"
            className="mt-1 shrink-0"
            size={18}
          />
          <ResourceMetadataList
            className="min-w-0 flex-1 sm:grid-cols-1 xl:grid-cols-1"
            items={[
              {
                label: 'Status',
                value: <AppointmentStatusBadge status={appointment.status} />,
              },
              {
                label: 'Datum',
                value: (
                  <time dateTime={appointment.startsAt}>
                    {formatDisplayDate(appointment.startsAt)}
                  </time>
                ),
              },
              {
                label: 'Uhrzeit',
                value: (
                  <span>
                    <time dateTime={appointment.startsAt}>
                      {formatDisplayTime(appointment.startsAt)}
                    </time>
                    {'–'}
                    <time dateTime={appointment.endsAt}>
                      {formatDisplayTime(appointment.endsAt)}
                    </time>{' '}
                    Uhr
                  </span>
                ),
              },
              {
                label: 'Dauer',
                value: getAppointmentDurationLabel(appointment),
              },
            ]}
          />
        </div>
      </ResourceDetailSection>

      <ResourceDetailSection
        id="responsibility"
        title="Beteiligte"
        variant="outlined"
      >
        <div className="space-y-5">
          <div className="flex gap-2">
            <UserRound
              aria-hidden="true"
              className="mt-1 shrink-0"
              size={18}
            />
            <div>
              <p className="text-on-surface-variant text-sm font-medium">
                Bürger
              </p>
              <p className="mt-1">{appointment.citizen.displayName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Building2
              aria-hidden="true"
              className="mt-1 shrink-0"
              size={18}
            />
            <div>
              <p className="text-on-surface-variant text-sm font-medium">
                Behörde
              </p>
              <Link
                className="text-primary focus-visible:outline-primary mt-1 inline-flex min-h-11 items-center rounded-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
                to={`/offices/${appointment.office.id}`}
              >
                {appointment.office.name}
              </Link>
            </div>
          </div>
        </div>
      </ResourceDetailSection>

      <ResourceDetailSection id="metadata" title="Metadaten" variant="subtle">
        <ResourceMetadataList
          className="sm:grid-cols-1 xl:grid-cols-1"
          items={metadataItems}
        />
      </ResourceDetailSection>
    </>
  )
}
