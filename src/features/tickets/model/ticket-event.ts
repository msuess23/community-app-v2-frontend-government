import { z } from 'zod'

import type {
  OfficeReference,
  PaginatedResponseTicketEventResponse,
  TicketEventResponse,
  UserReference,
} from '@/api/generated/models'
import { mapApiPage, type PageModel } from '@/api/contract/pagination'
import {
  getTicketUserReferenceLabel,
  type TicketOfficeReference,
  type TicketUserReference,
} from '@/features/tickets/model/ticket-model'
import type { ResourceEvent } from '@/shared/resource-detail/event-renderer-registry'

/** Represents one immutable event after crossing the generated API boundary. */
export type TicketEventRecord = ResourceEvent<Record<string, unknown>> &
  Readonly<{
    eventType: string
    references: Readonly<{
      offices: readonly TicketOfficeReference[]
      users: readonly TicketUserReference[]
    }>
  }>

export const ticketEventPayloadSchemas = {
  CITIZEN_RESPONDED: z.object({
    message: z.string(),
    return_to_user_id: z.string(),
  }),
  CITIZEN_RESPONSE_REQUESTED: z.object({
    question: z.string(),
    return_to_user_id: z.string(),
  }),
  COSIGNATURE_REQUESTED: z.object({
    comment: z.string().nullable().optional(),
    return_to_user_id: z.string(),
    target_user_id: z.string(),
  }),
  ESCALATION_DECIDED: z.object({
    comment: z.string().nullable().optional(),
    decision: z.enum(['APPROVED', 'REJECTED']),
    return_to_user_id: z.string(),
  }),
  PRIMARY_OFFICER_ASSIGNED: z.object({
    comment: z.string().nullable().optional(),
    primary_officer_id: z.string(),
  }),
  PRIMARY_OFFICER_REASSIGNED: z.object({
    comment: z.string().nullable().optional(),
    new_primary_officer_id: z.string(),
    previous_primary_officer_id: z.string(),
  }),
  TICKET_CANCELLED: z.object({
    reason: z.string().nullable().optional(),
  }),
  TICKET_COMMENTED: z.object({
    is_internal: z.boolean(),
    text: z.string(),
  }),
  TICKET_COMPLETED: z.object({
    message: z.string(),
    outcome: z.enum(['RESOLVED', 'REJECTED']),
  }),
  TICKET_COSIGNED: z.object({
    comment: z.string().nullable().optional(),
    return_to_user_id: z.string(),
  }),
  TICKET_COVER_IMAGE_CHANGED: z.object({
    image_id: z.string(),
  }),
  TICKET_DETAILS_UPDATED: z.object({
    address: z.unknown().nullable().optional(),
    category: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    visibility: z.string().nullable().optional(),
  }),
  TICKET_DISPATCHED: z.object({
    comment: z.string().nullable().optional(),
    office_id: z.string(),
  }),
  TICKET_ESCALATED: z.object({
    manager_user_id: z.string(),
    reason: z.string(),
    return_to_user_id: z.string(),
  }),
  TICKET_FORWARDED: z.object({
    comment: z.string().nullable().optional(),
    target_user_id: z.string(),
  }),
  TICKET_IMAGE_ADDED: z.object({
    height: z.number().int().nullable().optional(),
    image_id: z.string(),
    is_cover: z.boolean(),
    mime_type: z.string(),
    original_filename: z.string(),
    size_bytes: z.number().int(),
    storage_key: z.string(),
    width: z.number().int().nullable().optional(),
  }),
  TICKET_IMAGE_REMOVED: z.object({
    image_id: z.string(),
    reason: z.string().nullable().optional(),
  }),
  TICKET_RETURNED_TO_DISPATCH: z.object({
    previous_office_id: z.string(),
    previous_primary_officer_id: z.string().nullable().optional(),
    reason: z.string(),
  }),
  TICKET_SUBMITTED: z.object({
    address: z.unknown().nullable().optional(),
    category: z.enum(['INFRASTRUCTURE', 'CLEANING', 'SAFETY', 'NOISE', 'OTHER']),
    creator_user_id: z.string(),
    description: z.string().nullable().optional(),
    title: z.string(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']),
  }),
} as const

export type TicketEventPayloadType = keyof typeof ticketEventPayloadSchemas
export type TicketEventPayload<TType extends TicketEventPayloadType> = z.infer<
  (typeof ticketEventPayloadSchemas)[TType]
>

/** Converts one generated event while preserving unknown future event types. */
export function mapTicketEventResponse(
  response: TicketEventResponse,
): TicketEventRecord {
  return {
    actor: {
      id: response.actor.id,
      label: getTicketUserReferenceLabel(response.actor.display_name),
    },
    eventType: response.event_type,
    id: response.id,
    occurredAt: response.occurred_at,
    payload: { ...response.payload },
    references: {
      offices: (response.references?.offices ?? []).map(mapOfficeReference),
      users: (response.references?.users ?? []).map(mapUserReference),
    },
    sequenceNumber: response.sequence_number,
  }
}

/** Maps one newest-first backend event page for incremental history loading. */
export function mapTicketEventPage(
  response: PaginatedResponseTicketEventResponse,
): PageModel<TicketEventRecord> {
  return mapApiPage(response, mapTicketEventResponse)
}

/** Safely validates a known event payload without rejecting the whole stream. */
export function parseTicketEventPayload<TType extends TicketEventPayloadType>(
  event: TicketEventRecord,
  eventType: TType,
): TicketEventPayload<TType> | null {
  const schema = ticketEventPayloadSchemas[eventType] as unknown as z.ZodType<
    TicketEventPayload<TType>
  >
  const result = schema.safeParse(event.payload)
  return result.success ? result.data : null
}

/** Resolves one response-only user label referenced by an immutable payload ID. */
export function findTicketEventUser(
  event: TicketEventRecord,
  userId: string | null | undefined,
): TicketUserReference | null {
  if (!userId) {
    return null
  }
  return event.references.users.find((user) => user.id === userId) ?? null
}

/** Resolves one response-only office label referenced by an immutable payload ID. */
export function findTicketEventOffice(
  event: TicketEventRecord,
  officeId: string | null | undefined,
): TicketOfficeReference | null {
  if (!officeId) {
    return null
  }
  return event.references.offices.find((office) => office.id === officeId) ?? null
}

function mapUserReference(response: UserReference): TicketUserReference {
  return {
    displayName: getTicketUserReferenceLabel(response.display_name),
    id: response.id,
  }
}

function mapOfficeReference(response: OfficeReference): TicketOfficeReference {
  return {
    id: response.id,
    name: response.name,
  }
}
