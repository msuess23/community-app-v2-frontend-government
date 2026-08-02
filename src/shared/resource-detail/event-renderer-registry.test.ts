import {
  createResourceEventRendererRegistry,
  resolveResourceEventPresentation,
  type ResourceEvent,
} from '@/shared/resource-detail/event-renderer-registry'

describe('resource event renderer registry', () => {
  it('resolves feature-owned event presentations', () => {
    const registry = createResourceEventRendererRegistry<ResourceEvent>([
      {
        eventType: 'KNOWN_EVENT',
        render: () => ({ title: 'Bekanntes Ereignis' }),
      },
    ])
    const event: ResourceEvent = {
      eventType: 'KNOWN_EVENT',
      id: 'event-1',
      occurredAt: '2026-07-28T08:55:00Z',
      payload: {},
      sequenceNumber: 1,
    }

    expect(resolveResourceEventPresentation(event, registry)).toEqual({
      title: 'Bekanntes Ereignis',
    })
  })

  it('rejects duplicate event renderer registrations', () => {
    expect(() =>
      createResourceEventRendererRegistry<ResourceEvent>([
        {
          eventType: 'KNOWN_EVENT',
          render: () => ({ title: 'Erste Darstellung' }),
        },
        {
          eventType: 'KNOWN_EVENT',
          render: () => ({ title: 'Zweite Darstellung' }),
        },
      ]),
    ).toThrow('Resource event "KNOWN_EVENT" is registered more than once.')
  })
})
