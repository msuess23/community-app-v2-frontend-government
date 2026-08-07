import type { ReactNode } from 'react'

import {
  parseAppointmentEventPayload,
  type AppointmentEventPayload,
  type AppointmentEventPayloadType,
  type AppointmentEventRecord,
} from '@/features/appointments/model/appointment-event'
import {
  getAppointmentDocumentTypeLabel,
} from '@/features/appointments/model/appointment-document'
import {
  formatDisplayDateTime,
  formatDisplayFileSize,
} from '@/shared/format/display-values'
import { EventDetails } from '@/shared/resource-detail/EventDetails'
import {
  createResourceEventRendererRegistry,
  type ResourceEventPresentation,
  type ResourceEventRenderer,
} from '@/shared/resource-detail/event-renderer-registry'

const EVENT_LABELS: Readonly<Record<AppointmentEventPayloadType, string>> = {
  APPOINTMENT_BOOKED: 'Termin gebucht',
  APPOINTMENT_CANCELLED: 'Termin storniert',
  APPOINTMENT_COMPLETED: 'Termin abgeschlossen',
  APPOINTMENT_MARKED_NO_SHOW: 'Nicht erschienen dokumentiert',
  APPOINTMENT_RESCHEDULED: 'Termin verschoben',
  DOCUMENT_VERSION_ADDED: 'Dokumentversion hinzugefügt',
}

/** Owns the complete known presentation of the appointment event stream. */
export const appointmentEventRendererRegistry =
  createResourceEventRendererRegistry<AppointmentEventRecord>([
    renderer('APPOINTMENT_BOOKED', (_event, payload) => ({
      description: 'Der Termin wurde für einen freien Terminslot gebucht.',
      details: (
        <EventDetails
          items={[
            ['Beginn', dateTime(payload.starts_at)],
            ['Ende', dateTime(payload.ends_at)],
            ['Anliegen', payload.reason ?? 'Kein Anliegen hinterlegt'],
            ['Ticketverknüpfung', payload.ticket_id ? 'Vorhanden' : 'Keine'],
          ]}
        />
      ),
      title: EVENT_LABELS.APPOINTMENT_BOOKED,
      tone: 'info',
    })),
    renderer('APPOINTMENT_RESCHEDULED', (_event, payload) => ({
      description:
        'Der bisherige Terminslot wurde freigegeben und ein neuer Terminslot verbindlich gebucht.',
      details: (
        <EventDetails
          items={[
            ['Bisheriger Beginn', dateTime(payload.previous_starts_at)],
            ['Bisheriges Ende', dateTime(payload.previous_ends_at)],
            ['Neuer Beginn', dateTime(payload.new_starts_at)],
            ['Neues Ende', dateTime(payload.new_ends_at)],
            ['Begründung', payload.reason],
          ]}
        />
      ),
      title: EVENT_LABELS.APPOINTMENT_RESCHEDULED,
      tone: 'info',
    })),
    renderer('APPOINTMENT_CANCELLED', (_event, payload) => ({
      description:
        'Der Termin wurde storniert und der bisher gebuchte Terminslot wieder freigegeben.',
      details: <EventDetails items={[['Begründung', payload.reason]]} />,
      title: EVENT_LABELS.APPOINTMENT_CANCELLED,
      tone: 'warning',
    })),
    renderer('APPOINTMENT_COMPLETED', (_event, payload) => ({
      description:
        'Der Termin wurde als durchgeführt abgeschlossen. Der Terminslot ist verbraucht.',
      details: optionalText('Interne Notiz', payload.comment),
      title: EVENT_LABELS.APPOINTMENT_COMPLETED,
      tone: 'success',
    })),
    renderer('APPOINTMENT_MARKED_NO_SHOW', (_event, payload) => ({
      description:
        'Das Nichterscheinen wurde dokumentiert. Der Terminslot ist verbraucht.',
      details: optionalText('Interne Notiz', payload.comment),
      title: EVENT_LABELS.APPOINTMENT_MARKED_NO_SHOW,
      tone: 'warning',
    })),
    renderer('DOCUMENT_VERSION_ADDED', (_event, payload) => ({
      description: payload.replaced_version_id
        ? 'Eine neue unveränderliche Version eines vorhandenen Dokuments wurde gespeichert.'
        : 'Ein neues unveränderliches Termindokument wurde gespeichert.',
      details: (
        <EventDetails
          items={[
            [
              'Dokumenttyp',
              getAppointmentDocumentTypeLabel(payload.document_type),
            ],
            ['Dateiname', payload.original_filename],
            ['Version', String(payload.version_number)],
            ['Dateigröße', formatDisplayFileSize(payload.size_bytes)],
            [
              'Bürgerfreigabe',
              payload.visible_to_citizen ? 'Freigegeben' : 'Nur intern',
            ],
          ]}
        />
      ),
      title: EVENT_LABELS.DOCUMENT_VERSION_ADDED,
      tone: 'info',
    })),
  ])

function renderer<TType extends AppointmentEventPayloadType>(
  eventType: TType,
  renderValid: (
    event: AppointmentEventRecord,
    payload: AppointmentEventPayload<TType>,
  ) => ResourceEventPresentation,
): ResourceEventRenderer<AppointmentEventRecord> {
  return {
    eventType,
    render: (event) => {
      const payload = parseAppointmentEventPayload(event, eventType)
      if (!payload) {
        return {
          description:
            'Die gespeicherten Ereignisdetails entsprechen nicht vollständig dem erwarteten Format. Der Eventstream bleibt verfügbar.',
          title: EVENT_LABELS[eventType],
          tone: 'warning',
        }
      }
      return renderValid(event, payload)
    },
  }
}

function dateTime(value: string): ReactNode {
  return <time dateTime={value}>{formatDisplayDateTime(value)}</time>
}

function optionalText(
  label: string,
  value: string | null | undefined,
): ReactNode | undefined {
  return value ? <EventDetails items={[[label, value]]} /> : undefined
}
