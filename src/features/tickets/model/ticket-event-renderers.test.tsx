import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TicketEventType } from '@/api/generated/models'
import type { TicketEventRecord } from '@/features/tickets/model/ticket-event'
import { ticketEventRendererRegistry } from '@/features/tickets/model/ticket-event-renderers'
import { EventTimeline } from '@/shared/resource-detail/EventTimeline'

const PAYLOADS: Readonly<Record<string, Record<string, unknown>>> = {
  CITIZEN_RESPONDED: {
    message: 'Das Foto wurde am Montag aufgenommen.',
    return_to_user_id: 'officer-1',
  },
  CITIZEN_RESPONSE_REQUESTED: {
    question: 'Wann wurde der Schaden bemerkt?',
    return_to_user_id: 'officer-1',
  },
  COSIGNATURE_REQUESTED: {
    comment: 'Bitte fachlich prüfen.',
    return_to_user_id: 'officer-1',
    target_user_id: 'officer-2',
  },
  ESCALATION_DECIDED: {
    comment: 'Maßnahme ist freigegeben.',
    decision: 'APPROVED',
    return_to_user_id: 'officer-1',
  },
  PRIMARY_OFFICER_ASSIGNED: {
    comment: null,
    primary_officer_id: 'officer-1',
  },
  PRIMARY_OFFICER_REASSIGNED: {
    comment: 'Vertretung übernimmt.',
    new_primary_officer_id: 'officer-2',
    previous_primary_officer_id: 'officer-1',
  },
  TICKET_CANCELLED: { reason: 'Doppelt erfasst.' },
  TICKET_COMMENTED: { is_internal: true, text: 'Interne Prüfung.' },
  TICKET_COMPLETED: { message: 'Schaden behoben.', outcome: 'RESOLVED' },
  TICKET_COSIGNED: {
    comment: 'Mitzeichnung erteilt.',
    return_to_user_id: 'officer-1',
  },
  TICKET_COVER_IMAGE_CHANGED: { image_id: 'image-1' },
  TICKET_DETAILS_UPDATED: { title: 'Aktualisierter Titel' },
  TICKET_DISPATCHED: { comment: null, office_id: 'office-1' },
  TICKET_ESCALATED: {
    manager_user_id: 'manager-1',
    reason: 'Freigabe erforderlich.',
    return_to_user_id: 'officer-1',
  },
  TICKET_FORWARDED: {
    comment: 'Bitte übernehmen.',
    target_user_id: 'officer-2',
  },
  TICKET_IMAGE_ADDED: {
    height: 720,
    image_id: 'image-1',
    is_cover: true,
    mime_type: 'image/jpeg',
    original_filename: 'schlagloch.jpg',
    size_bytes: 1200,
    storage_key: 'tickets/image-1',
    width: 1280,
  },
  TICKET_IMAGE_REMOVED: { image_id: 'image-1', reason: 'Veraltet.' },
  TICKET_RETURNED_TO_DISPATCH: {
    previous_office_id: 'office-1',
    previous_primary_officer_id: 'officer-1',
    reason: 'Falsche Zuständigkeit.',
  },
  TICKET_SUBMITTED: {
    category: 'INFRASTRUCTURE',
    creator_user_id: 'citizen-1',
    description: 'Schlagloch am Fahrbahnrand.',
    title: 'Schlagloch',
    visibility: 'PUBLIC',
  },
}

describe('ticket event renderer registry', () => {
  it('registers a safe renderer for every backend event type', () => {
    expect([...ticketEventRendererRegistry.keys()].sort()).toEqual(
      Object.values(TicketEventType).sort(),
    )
  })

  it.each(Object.values(TicketEventType))(
    'renders %s without the unknown-event fallback',
    (eventType) => {
      render(
        <EventTimeline
          events={[createEvent(eventType, PAYLOADS[eventType] ?? {})]}
          registry={ticketEventRendererRegistry}
          showDevelopmentDetails={false}
        />,
      )

      expect(screen.queryByText(/Unbekanntes Ereignis/)).not.toBeInTheDocument()
      expect(
        screen.queryByText(/noch keine fachliche Darstellung/),
      ).not.toBeInTheDocument()
      expect(screen.getByText('Ereignis #1')).toBeVisible()
    },
  )

  it('keeps unknown future events visible without exposing payloads in production', () => {
    render(
      <EventTimeline
        events={[createEvent('TICKET_FUTURE_EVENT', { internal_key: 'secret' })]}
        registry={ticketEventRendererRegistry}
        showDevelopmentDetails={false}
      />,
    )

    expect(
      screen.getByText('Unbekanntes Ereignis: TICKET_FUTURE_EVENT'),
    ).toBeVisible()
    expect(
      screen.getByText(/noch keine fachliche Darstellung/),
    ).toBeVisible()
    expect(screen.queryByText('internal_key')).not.toBeInTheDocument()
  })

  it('keeps a malformed known event visible with a non-technical warning', () => {
    render(
      <EventTimeline
        events={[createEvent('TICKET_FORWARDED', { target_user_id: 42 })]}
        registry={ticketEventRendererRegistry}
        showDevelopmentDetails={false}
      />,
    )

    expect(screen.getByText('Ticket weitergeleitet')).toBeVisible()
    expect(
      screen.getByText(/entsprechen nicht vollständig dem erwarteten Format/),
    ).toBeVisible()
  })
})

function createEvent(
  eventType: string,
  payload: Record<string, unknown>,
): TicketEventRecord {
  return {
    actor: { id: 'officer-1', label: 'Olaf Ordnung' },
    eventType,
    id: `event-${eventType}`,
    occurredAt: '2026-08-02T10:00:00Z',
    payload,
    references: {
      offices: [{ id: 'office-1', name: 'Tiefbauamt' }],
      users: [
        { displayName: 'Olaf Ordnung', id: 'officer-1' },
        { displayName: 'Erika Beispiel', id: 'officer-2' },
        { displayName: 'Mara Management', id: 'manager-1' },
      ],
    },
    sequenceNumber: 1,
  }
}
