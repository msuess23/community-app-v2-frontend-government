import type { ReactNode } from 'react'

import {
  findTicketEventOffice,
  findTicketEventUser,
  parseTicketEventPayload,
  type TicketEventPayload,
  type TicketEventPayloadType,
  type TicketEventRecord,
} from '@/features/tickets/model/ticket-event'
import {
  getTicketCategoryLabel,
  getTicketVisibilityLabel,
} from '@/features/tickets/model/ticket-model'
import { formatDisplayFileSize } from '@/shared/format/display-values'
import { TicketEventChangedFields } from '@/features/tickets/model/TicketEventChangedFields'
import { EventDetails } from '@/shared/resource-detail/EventDetails'
import {
  createResourceEventRendererRegistry,
  type ResourceEventPresentation,
  type ResourceEventRenderer,
} from '@/shared/resource-detail/event-renderer-registry'

const EVENT_LABELS: Readonly<Record<TicketEventPayloadType, string>> = {
  CITIZEN_RESPONDED: 'Bürgerantwort eingegangen',
  CITIZEN_RESPONSE_REQUESTED: 'Bürgerantwort angefordert',
  COSIGNATURE_REQUESTED: 'Mitzeichnung angefordert',
  ESCALATION_DECIDED: 'Eskalation entschieden',
  PRIMARY_OFFICER_ASSIGNED: 'Primärer Bearbeiter zugewiesen',
  PRIMARY_OFFICER_REASSIGNED: 'Primärer Bearbeiter neu zugewiesen',
  TICKET_CANCELLED: 'Ticket storniert',
  TICKET_COMMENTED: 'Kommentar hinzugefügt',
  TICKET_COMPLETED: 'Ticket abgeschlossen',
  TICKET_COSIGNED: 'Ticket mitgezeichnet',
  TICKET_COVER_IMAGE_CHANGED: 'Titelbild geändert',
  TICKET_DETAILS_UPDATED: 'Ticketdaten aktualisiert',
  TICKET_DISPATCHED: 'Ticket disponiert',
  TICKET_ESCALATED: 'Ticket eskaliert',
  TICKET_FORWARDED: 'Ticket weitergeleitet',
  TICKET_IMAGE_ADDED: 'Bild hinzugefügt',
  TICKET_IMAGE_REMOVED: 'Bild entfernt',
  TICKET_RETURNED_TO_DISPATCH: 'An Disposition zurückgegeben',
  TICKET_SUBMITTED: 'Ticket eingereicht',
}

/** Owns the complete known presentation of the immutable ticket event stream. */
export const ticketEventRendererRegistry =
  createResourceEventRendererRegistry<TicketEventRecord>([
    renderer('TICKET_SUBMITTED', (_event, payload) => ({
      description: (
        <>
          {payload.title} wurde in der Kategorie{' '}
          <strong>{getTicketCategoryLabel(payload.category)}</strong>{' '}
          eingereicht.
        </>
      ),
      details: (
        <EventDetails
          items={[
            ['Sichtbarkeit', getTicketVisibilityLabel(payload.visibility)],
            ['Beschreibung', payload.description ?? 'Keine Beschreibung'],
          ]}
        />
      ),
      title: EVENT_LABELS.TICKET_SUBMITTED,
      tone: 'info',
    })),
    renderer('TICKET_DETAILS_UPDATED', (_event, payload) => ({
      description: 'Die vom Bürger bearbeitbaren Ticketdaten wurden geändert.',
      details: (
        <TicketEventChangedFields
          fields={[
            ['Titel', payload.title !== undefined],
            ['Beschreibung', payload.description !== undefined],
            ['Kategorie', payload.category !== undefined],
            ['Adresse', payload.address !== undefined],
            ['Sichtbarkeit', payload.visibility !== undefined],
          ]}
        />
      ),
      title: EVENT_LABELS.TICKET_DETAILS_UPDATED,
      tone: 'info',
    })),
    renderer('TICKET_CANCELLED', (_event, payload) => ({
      description: 'Der Ersteller hat das Ticket vor Beginn der Bearbeitung storniert.',
      details: optionalText('Begründung', payload.reason),
      title: EVENT_LABELS.TICKET_CANCELLED,
      tone: 'danger',
    })),
    renderer('TICKET_DISPATCHED', (event, payload) => {
      const office = findTicketEventOffice(event, payload.office_id)
      return {
        description: office
          ? `Das Ticket wurde der Behörde „${office.name}“ zugeordnet.`
          : 'Das Ticket wurde einer Behörde zugeordnet.',
        details: optionalText('Kommentar', payload.comment),
        title: EVENT_LABELS.TICKET_DISPATCHED,
        tone: 'info',
      }
    }),
    renderer('PRIMARY_OFFICER_ASSIGNED', (event, payload) => ({
      description: `${userLabel(event, payload.primary_officer_id)} wurde als primärer Bearbeiter festgelegt.`,
      details: optionalText('Kommentar', payload.comment),
      title: EVENT_LABELS.PRIMARY_OFFICER_ASSIGNED,
      tone: 'info',
    })),
    renderer('PRIMARY_OFFICER_REASSIGNED', (event, payload) => ({
      description: `${userLabel(event, payload.new_primary_officer_id)} übernimmt die primäre Bearbeitung.`,
      details: (
        <EventDetails
          items={[
            [
              'Vorheriger primärer Bearbeiter',
              userLabel(event, payload.previous_primary_officer_id),
            ],
            ['Kommentar', payload.comment ?? 'Kein Kommentar'],
          ]}
        />
      ),
      title: EVENT_LABELS.PRIMARY_OFFICER_REASSIGNED,
      tone: 'warning',
    })),
    renderer('TICKET_RETURNED_TO_DISPATCH', (event, payload) => ({
      description: 'Die fachliche Zuordnung wurde aufgehoben und muss neu disponiert werden.',
      details: (
        <EventDetails
          items={[
            [
              'Vorherige Behörde',
              officeLabel(event, payload.previous_office_id),
            ],
            [
              'Vorheriger primärer Bearbeiter',
              payload.previous_primary_officer_id
                ? userLabel(event, payload.previous_primary_officer_id)
                : 'Nicht zugewiesen',
            ],
            ['Begründung', payload.reason],
          ]}
        />
      ),
      title: EVENT_LABELS.TICKET_RETURNED_TO_DISPATCH,
      tone: 'warning',
    })),
    renderer('TICKET_FORWARDED', (event, payload) => ({
      description: `${userLabel(event, payload.target_user_id)} übernimmt die aktuelle Koordination.`,
      details: optionalText('Kommentar', payload.comment),
      title: EVENT_LABELS.TICKET_FORWARDED,
      tone: 'info',
    })),
    renderer('COSIGNATURE_REQUESTED', (event, payload) => ({
      description: `Die Mitzeichnung wurde bei ${userLabel(event, payload.target_user_id)} angefordert.`,
      details: (
        <EventDetails
          items={[
            ['Rückgabe an', userLabel(event, payload.return_to_user_id)],
            ['Kommentar', payload.comment ?? 'Kein Kommentar'],
          ]}
        />
      ),
      title: EVENT_LABELS.COSIGNATURE_REQUESTED,
      tone: 'warning',
    })),
    renderer('TICKET_COSIGNED', (event, payload) => ({
      description: `Nach der Mitzeichnung wurde das Ticket an ${userLabel(event, payload.return_to_user_id)} zurückgegeben.`,
      details: optionalText('Kommentar', payload.comment),
      title: EVENT_LABELS.TICKET_COSIGNED,
      tone: 'success',
    })),
    renderer('CITIZEN_RESPONSE_REQUESTED', (event, payload) => ({
      description: `Nach der Antwort wird das Ticket an ${userLabel(event, payload.return_to_user_id)} zurückgegeben.`,
      details: optionalText('Frage', payload.question),
      title: EVENT_LABELS.CITIZEN_RESPONSE_REQUESTED,
      tone: 'warning',
    })),
    renderer('CITIZEN_RESPONDED', (event, payload) => ({
      description: `Die Bearbeitung geht bei ${userLabel(event, payload.return_to_user_id)} weiter.`,
      details: optionalText('Antwort', payload.message),
      title: EVENT_LABELS.CITIZEN_RESPONDED,
      tone: 'info',
    })),
    renderer('TICKET_ESCALATED', (event, payload) => ({
      description: `${userLabel(event, payload.manager_user_id)} wurde um eine Entscheidung gebeten.`,
      details: (
        <EventDetails
          items={[
            ['Rückgabe an', userLabel(event, payload.return_to_user_id)],
            ['Begründung', payload.reason],
          ]}
        />
      ),
      title: EVENT_LABELS.TICKET_ESCALATED,
      tone: 'warning',
    })),
    renderer('ESCALATION_DECIDED', (event, payload) => {
      const approved = payload.decision === 'APPROVED'
      return {
        description: `Die Eskalation wurde ${approved ? 'genehmigt' : 'abgelehnt'} und an ${userLabel(event, payload.return_to_user_id)} zurückgegeben.`,
        details: optionalText('Kommentar', payload.comment),
        title: approved ? 'Eskalation genehmigt' : 'Eskalation abgelehnt',
        tone: approved ? 'success' : 'danger',
      }
    }),
    renderer('TICKET_COMPLETED', (_event, payload) => {
      const resolved = payload.outcome === 'RESOLVED'
      return {
        description: resolved
          ? 'Das Ticket wurde als erledigt abgeschlossen.'
          : 'Das Ticket wurde als abgelehnt abgeschlossen.',
        details: optionalText('Öffentliche Abschlussnachricht', payload.message),
        title: EVENT_LABELS.TICKET_COMPLETED,
        tone: resolved ? 'success' : 'danger',
      }
    }),
    renderer('TICKET_COMMENTED', (_event, payload) => ({
      description: payload.is_internal
        ? 'Eine interne Bearbeitungsnotiz wurde ergänzt.'
        : 'Ein öffentlicher Kommentar wurde ergänzt.',
      details: optionalText(
        payload.is_internal ? 'Interne Notiz' : 'Kommentar',
        payload.text,
      ),
      title: payload.is_internal
        ? 'Interne Notiz hinzugefügt'
        : 'Öffentlicher Kommentar hinzugefügt',
      tone: payload.is_internal ? 'warning' : 'info',
    })),
    renderer('TICKET_IMAGE_ADDED', (_event, payload) => ({
      description: payload.is_cover
        ? 'Ein neues Bild wurde hochgeladen und als Titelbild gesetzt.'
        : 'Ein neues Bild wurde zum Ticket hinzugefügt.',
      details: (
        <EventDetails
          items={[
            ['Dateiname', payload.original_filename],
            ['Dateityp', payload.mime_type],
            ['Dateigröße', formatDisplayFileSize(payload.size_bytes)],
          ]}
        />
      ),
      title: EVENT_LABELS.TICKET_IMAGE_ADDED,
      tone: 'info',
    })),
    renderer('TICKET_IMAGE_REMOVED', (_event, payload) => ({
      description: 'Das Bild wurde aus der aktuellen Ticketansicht entfernt und historisch erhalten.',
      details: optionalText('Begründung', payload.reason),
      title: EVENT_LABELS.TICKET_IMAGE_REMOVED,
      tone: 'warning',
    })),
    renderer('TICKET_COVER_IMAGE_CHANGED', () => ({
      description: 'Ein vorhandenes Ticketbild wurde als neues Titelbild ausgewählt.',
      title: EVENT_LABELS.TICKET_COVER_IMAGE_CHANGED,
      tone: 'info',
    })),
  ])

function renderer<TType extends TicketEventPayloadType>(
  eventType: TType,
  renderValid: (
    event: TicketEventRecord,
    payload: TicketEventPayload<TType>,
  ) => ResourceEventPresentation,
): ResourceEventRenderer<TicketEventRecord> {
  return {
    eventType,
    render: (event) => {
      const payload = parseTicketEventPayload(event, eventType)
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

function userLabel(event: TicketEventRecord, userId: string): string {
  return findTicketEventUser(event, userId)?.displayName ?? 'Unbekannte Person'
}

function officeLabel(event: TicketEventRecord, officeId: string): string {
  return findTicketEventOffice(event, officeId)?.name ?? 'Unbekannte Behörde'
}

function optionalText(label: string, value: string | null | undefined): ReactNode {
  return value ? <EventDetails items={[[label, value]]} /> : undefined
}
