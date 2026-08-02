import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import { EventTimeline } from '@/shared/resource-detail/EventTimeline'
import {
  createResourceEventRendererRegistry,
  type ResourceEvent,
} from '@/shared/resource-detail/event-renderer-registry'
import { renderWithProviders } from '@/test/render'

const events: ResourceEvent[] = [
  {
    actor: { label: 'Mara Beispiel' },
    eventType: 'KNOWN',
    id: 'event-3',
    occurredAt: '2026-07-28T09:35:00Z',
    payload: { note: 'sichtbar' },
    sequenceNumber: 3,
  },
  {
    eventType: 'UNKNOWN',
    id: 'event-1',
    occurredAt: '2026-07-28T08:55:00Z',
    payload: { secret: 'nur Entwicklung' },
    sequenceNumber: 1,
  },
]

const registry = createResourceEventRendererRegistry<ResourceEvent>([
  {
    eventType: 'KNOWN',
    render: () => ({
      description: 'Das bekannte Ereignis wurde fachlich übersetzt.',
      title: 'Bekanntes Ereignis',
      tone: 'info',
    }),
  },
])

describe('EventTimeline', () => {
  it('preserves supplied order and uses a safe fallback for unknown events', () => {
    renderWithProviders(
      <EventTimeline
        events={events}
        registry={registry}
        showDevelopmentDetails={false}
      />,
    )

    const sequenceLabels = screen.getAllByText(/Ereignis #/)
    expect(sequenceLabels.map((label) => label.textContent)).toEqual([
      'Ereignis #3',
      'Ereignis #1',
    ])
    expect(screen.getByText('Bekanntes Ereignis')).toBeInTheDocument()
    expect(
      screen.getByText('Unbekanntes Ereignis: UNKNOWN'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/nur Entwicklung/)).not.toBeInTheDocument()
  })

  it('loads older pages explicitly and exposes raw payload only in development mode', async () => {
    const user = userEvent.setup()
    const loadOlder = vi.fn()

    renderWithProviders(
      <EventTimeline
        events={events}
        hasOlderEvents
        onLoadOlder={loadOlder}
        registry={registry}
        showDevelopmentDetails
      />,
    )

    await user.click(screen.getByText('Entwicklungsdetails anzeigen'))
    expect(screen.getByText(/nur Entwicklung/)).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Ältere Ereignisse laden' }),
    )
    expect(loadOlder).toHaveBeenCalledTimes(1)
  })
})
