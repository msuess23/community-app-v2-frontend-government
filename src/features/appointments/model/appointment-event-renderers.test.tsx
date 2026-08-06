import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { appointmentEventRendererRegistry } from '@/features/appointments/model/appointment-event-renderers'
import type { AppointmentEventRecord } from '@/features/appointments/model/appointment-event'
import { EventTimeline } from '@/shared/resource-detail/EventTimeline'

describe('appointment event renderers', () => {
  it('registers all six backend event types', () => {
    expect([...appointmentEventRendererRegistry.keys()]).toEqual([
      'APPOINTMENT_BOOKED',
      'APPOINTMENT_RESCHEDULED',
      'APPOINTMENT_CANCELLED',
      'APPOINTMENT_COMPLETED',
      'APPOINTMENT_MARKED_NO_SHOW',
      'DOCUMENT_VERSION_ADDED',
    ])
  })

  it('renders schedule changes and internal notes without exposing payload IDs', () => {
    render(
      <EventTimeline
        events={[
          event('APPOINTMENT_RESCHEDULED', {
            new_ends_at: '2026-08-13T10:30:00Z',
            new_slot_id: 'slot-2',
            new_starts_at: '2026-08-13T10:00:00Z',
            previous_ends_at: '2026-08-12T09:30:00Z',
            previous_slot_id: 'slot-1',
            previous_starts_at: '2026-08-12T09:00:00Z',
            reason: 'Bürgerwunsch',
          }),
          event('APPOINTMENT_COMPLETED', { comment: 'Unterlagen geprüft.' }),
        ]}
        registry={appointmentEventRendererRegistry}
        showDevelopmentDetails={false}
      />,
    )

    expect(screen.getByText('Termin verschoben')).toBeVisible()
    expect(screen.getByText('Bürgerwunsch')).toBeVisible()
    expect(screen.getByText('Unterlagen geprüft.')).toBeVisible()
    expect(screen.queryByText('slot-1')).not.toBeInTheDocument()
  })

  it('falls back safely for malformed and future event payloads', () => {
    render(
      <EventTimeline
        events={[
          event('APPOINTMENT_CANCELLED', { reason: 123 }),
          event('APPOINTMENT_REOPENED', { value: 'future' }, 2),
        ]}
        registry={appointmentEventRendererRegistry}
        showDevelopmentDetails={false}
      />,
    )

    expect(screen.getByText('Termin storniert')).toBeVisible()
    expect(
      screen.getByText(/entsprechen nicht vollständig dem erwarteten Format/),
    ).toBeVisible()
    expect(
      screen.getByText('Unbekanntes Ereignis: APPOINTMENT_REOPENED'),
    ).toBeVisible()
  })
})

function event(
  eventType: string,
  payload: Record<string, unknown>,
  sequenceNumber = 1,
): AppointmentEventRecord {
  return {
    actor: { id: 'manager-1', label: 'Mara Management' },
    eventType,
    id: `event-${sequenceNumber}-${eventType}`,
    occurredAt: '2026-08-06T08:00:00Z',
    payload,
    sequenceNumber,
  }
}
