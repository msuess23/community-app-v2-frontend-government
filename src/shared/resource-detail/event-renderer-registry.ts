import type { ReactNode } from 'react'

import type { DataViewStatusTone } from '@/shared/data-view/DataViewStatusBadge'

export type ResourceEventActor = Readonly<{
  id?: string
  label: string
}>

export type ResourceEvent<TPayload = unknown> = Readonly<{
  actor?: ResourceEventActor | null
  eventType: string
  id: string
  occurredAt: string
  payload: TPayload
  sequenceNumber: number
}>

export type ResourceEventPresentation = Readonly<{
  description?: ReactNode
  details?: ReactNode
  title: ReactNode
  tone?: DataViewStatusTone
}>

export type ResourceEventRenderer<TEvent extends ResourceEvent> = Readonly<{
  eventType: string
  render: (event: TEvent) => ResourceEventPresentation
}>

export type ResourceEventRendererRegistry<TEvent extends ResourceEvent> =
  ReadonlyMap<string, ResourceEventRenderer<TEvent>>

/** Builds an immutable event renderer registry and rejects duplicate event types. */
export function createResourceEventRendererRegistry<
  TEvent extends ResourceEvent,
>(
  renderers: ReadonlyArray<ResourceEventRenderer<TEvent>>,
): ResourceEventRendererRegistry<TEvent> {
  const registry = new Map<string, ResourceEventRenderer<TEvent>>()

  for (const renderer of renderers) {
    if (registry.has(renderer.eventType)) {
      throw new Error(
        `Resource event "${renderer.eventType}" is registered more than once.`,
      )
    }

    registry.set(renderer.eventType, renderer)
  }

  return registry
}

/** Resolves the feature-owned renderer for an immutable event without changing order. */
export function resolveResourceEventPresentation<TEvent extends ResourceEvent>(
  event: TEvent,
  registry: ResourceEventRendererRegistry<TEvent>,
): ResourceEventPresentation | undefined {
  return registry.get(event.eventType)?.render(event)
}
