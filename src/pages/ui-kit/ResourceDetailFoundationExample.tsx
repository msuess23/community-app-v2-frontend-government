import { CheckCircle2, UserRoundPlus } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { useFeedback } from '@/shared/feedback/feedback-context'
import { DataViewStatusBadge } from '@/shared/data-view/DataViewStatusBadge'
import { EventTimeline } from '@/shared/resource-detail/EventTimeline'
import {
  createResourceEventRendererRegistry,
  type ResourceEvent,
} from '@/shared/resource-detail/event-renderer-registry'
import { ResourceActionBar } from '@/shared/resource-detail/ResourceActionBar'
import { createResourceActionRegistry } from '@/shared/resource-detail/resource-action-registry'
import {
  ResourceDetailLayout,
  ResourceDetailSection,
  ResourceMetadataList,
} from '@/shared/resource-detail/ResourceDetailLayout'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { FormActions } from '@/shared/ui/FormActions'

const initialEvents: ResourceEvent[] = [
  {
    actor: { id: 'user-1', label: 'Mara Beispiel' },
    eventType: 'OFFICER_ASSIGNED',
    id: 'event-3',
    occurredAt: '2026-07-28T09:35:00Z',
    payload: { officerName: 'Mara Beispiel' },
    sequenceNumber: 3,
  },
  {
    actor: { id: 'user-2', label: 'Dispatch Nord' },
    eventType: 'TICKET_DISPATCHED',
    id: 'event-2',
    occurredAt: '2026-07-28T09:10:00Z',
    payload: { officeName: 'Tiefbauamt' },
    sequenceNumber: 2,
  },
]

const eventRegistry = createResourceEventRendererRegistry<ResourceEvent>([
  {
    eventType: 'OFFICER_ASSIGNED',
    render: (event) => ({
      description: `${readPayloadText(event.payload, 'officerName')} bearbeitet das Anliegen federführend.`,
      title: 'Hauptbearbeitung zugewiesen',
      tone: 'info',
    }),
  },
  {
    eventType: 'TICKET_DISPATCHED',
    render: (event) => ({
      description: `Das Anliegen wurde an ${readPayloadText(event.payload, 'officeName')} weitergeleitet.`,
      title: 'An Behörde verteilt',
      tone: 'neutral',
    }),
  },
  {
    eventType: 'TICKET_COMPLETED',
    render: () => ({
      description: 'Die Bearbeitung wurde mit einer serverbestätigten Aktion abgeschlossen.',
      title: 'Anliegen abgeschlossen',
      tone: 'success',
    }),
  },
])

type ExampleAction = 'ASSIGN_OFFICER' | 'COMPLETE'

/** Demonstrates the generic detail, action and event foundations without a backend feature. */
export function ResourceDetailFoundationExample() {
  const { notify } = useFeedback()
  const [allowedActions, setAllowedActions] = useState<ReadonlyArray<string>>([
    'ASSIGN_OFFICER',
    'COMPLETE',
    'ACTION_FROM_NEWER_BACKEND',
  ])
  const [events, setEvents] = useState(initialEvents)
  const [hasOlderEvents, setHasOlderEvents] = useState(true)
  const [status, setStatus] = useState('IN_PROGRESS')

  const actionRegistry = useMemo(
    () =>
      createResourceActionRegistry<ExampleAction>([
        {
          action: 'ASSIGN_OFFICER',
          buttonVariant: 'primary',
          description:
            'Das Beispiel zeigt einen featureeigenen Aktionsinhalt innerhalb des gemeinsamen Dialogs.',
          dialogTitle: 'Hauptbearbeitung zuweisen',
          icon: <UserRoundPlus aria-hidden="true" size={18} />,
          label: 'Zuweisen',
          render: ({ close }) => (
            <ExampleActionContent
              cancel={close}
              confirm={() => {
                setAllowedActions(['COMPLETE'])
                notify({
                  title: 'Beispielzuweisung gespeichert',
                  tone: 'success',
                })
                close()
              }}
              confirmLabel="Zuweisung speichern"
            >
              In einem Ticketfeature würde hier eine zugängliche Auswahl der
              zuständigen Person erscheinen.
            </ExampleActionContent>
          ),
        },
        {
          action: 'COMPLETE',
          buttonVariant: 'tertiary',
          description:
            'Nach Erfolg werden Detailprojektion, erlaubte Aktionen und Ereignisstrom gemeinsam aktualisiert.',
          dialogTitle: 'Anliegen abschließen',
          icon: <CheckCircle2 aria-hidden="true" size={18} />,
          label: 'Abschließen',
          render: ({ close }) => (
            <ExampleActionContent
              cancel={close}
              confirm={() => {
                setStatus('COMPLETED')
                setAllowedActions([])
                setEvents((current) => [
                  {
                    actor: { label: 'Mara Beispiel' },
                    eventType: 'TICKET_COMPLETED',
                    id: 'event-4',
                    occurredAt: new Date().toISOString(),
                    payload: {},
                    sequenceNumber: 4,
                  },
                  ...current,
                ])
                notify({
                  title: 'Beispielanliegen abgeschlossen',
                  tone: 'success',
                })
                close()
              }}
              confirmLabel="Abschluss bestätigen"
            >
              Der gemeinsame Mutation-Hook würde hier ausschließlich den vom
              Server bestätigten neuen Ressourcenstand übernehmen.
            </ExampleActionContent>
          ),
        },
      ]),
    [notify],
  )

  return (
    <ResourceDetailLayout
      aside={
        <Card variant="subtle">
          <h2 className="text-lg font-semibold">Verfügbare Aktionen</h2>
          <p className="text-on-surface-variant mt-2 mb-4 leading-7">
            Die Schaltflächen folgen der Reihenfolge von{' '}
            <code>allowed_actions</code> des Servers.
          </p>
          <ResourceActionBar
            allowedActions={allowedActions}
            onUnknownActions={() => undefined}
            registry={actionRegistry}
          />
        </Card>
      }
      backLink={{ label: 'Zur Beispielübersicht', to: '/ui-kit' }}
      description="Beschädigte Leuchte am Gehweg vor Hausnummer 12."
      eyebrow="Beispielanliegen · T-2026-1042"
      navigationItems={[
        { id: 'detail-example-overview', label: 'Übersicht' },
        { id: 'detail-example-history', label: 'Ereignisse' },
      ]}
      status={
        <DataViewStatusBadge tone={status === 'COMPLETED' ? 'success' : 'info'}>
          {status === 'COMPLETED' ? 'Abgeschlossen' : 'In Bearbeitung'}
        </DataViewStatusBadge>
      }
      title="Defekte Straßenbeleuchtung"
    >
      <ResourceDetailSection
        description="Die aktuelle Projektion wird getrennt vom unveränderlichen Ereignisstrom dargestellt."
        id="detail-example-overview"
        title="Aktueller Stand"
      >
        <ResourceMetadataList
          items={[
            { label: 'Kategorie', value: 'Infrastruktur' },
            { label: 'Zuständige Behörde', value: 'Tiefbauamt' },
            { label: 'Hauptbearbeitung', value: 'Mara Beispiel' },
            { label: 'Erstellt', value: '28.07.2026, 10:55 Uhr' },
            { label: 'Version', value: '3' },
          ]}
        />
      </ResourceDetailSection>

      <ResourceDetailSection
        description="Die Timeline sortiert nicht clientseitig und zeigt die serverseitige Sequenznummer jedes Ereignisses."
        id="detail-example-history"
        title="Ereignisverlauf"
      >
        <EventTimeline
          events={events}
          hasOlderEvents={hasOlderEvents}
          onLoadOlder={() => {
            setEvents((current) => [
              ...current,
              {
                actor: { label: 'Bürgerkonto' },
                eventType: 'UNKNOWN_EXAMPLE_EVENT',
                id: 'event-1',
                occurredAt: '2026-07-28T08:55:00Z',
                payload: { source: 'ui-kit' },
                sequenceNumber: 1,
              },
            ])
            setHasOlderEvents(false)
          }}
          registry={eventRegistry}
          showDevelopmentDetails
          total={events.length + (hasOlderEvents ? 1 : 0)}
        />
      </ResourceDetailSection>
    </ResourceDetailLayout>
  )
}

interface ExampleActionContentProps {
  cancel: () => void
  children: ReactNode
  confirm: () => void
  confirmLabel: string
}

/** Provides compact example content while real features own their action forms. */
function ExampleActionContent({
  cancel,
  children,
  confirm,
  confirmLabel,
}: ExampleActionContentProps) {
  return (
    <div className="space-y-5">
      <p className="text-on-surface-variant leading-7">{children}</p>
      <FormActions>
        <Button onPress={cancel} variant="outline">
          Abbrechen
        </Button>
        <Button onPress={confirm}>{confirmLabel}</Button>
      </FormActions>
    </div>
  )
}

/** Reads one example payload label without assuming arbitrary payload structure. */
function readPayloadText(payload: unknown, key: string): string {
  if (typeof payload !== 'object' || payload === null || !(key in payload)) {
    return 'Unbekannt'
  }

  const value = (payload as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : 'Unbekannt'
}
