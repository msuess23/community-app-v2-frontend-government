import { z } from 'zod'

import type {
  AppointmentEventResponse,
  PaginatedResponseAppointmentEventResponse,
} from '@/api/generated/models'
import { mapApiPage, type PageModel } from '@/api/contract/pagination'
import type { ResourceEvent } from '@/shared/resource-detail/event-renderer-registry'

/** One immutable appointment event after crossing the generated API boundary. */
export type AppointmentEventRecord = ResourceEvent<Record<string, unknown>> &
  Readonly<{ eventType: string }>

export const appointmentEventPayloadSchemas = {
  APPOINTMENT_BOOKED: z.object({
    citizen_id: z.string(),
    ends_at: z.string(),
    office_id: z.string(),
    reason: z.string().nullable().optional(),
    slot_id: z.string(),
    starts_at: z.string(),
    ticket_id: z.string().nullable().optional(),
  }),
  APPOINTMENT_CANCELLED: z.object({
    reason: z.string(),
    slot_id: z.string(),
  }),
  APPOINTMENT_COMPLETED: z.object({
    comment: z.string().nullable().optional(),
  }),
  APPOINTMENT_MARKED_NO_SHOW: z.object({
    comment: z.string().nullable().optional(),
  }),
  APPOINTMENT_RESCHEDULED: z.object({
    new_ends_at: z.string(),
    new_slot_id: z.string(),
    new_starts_at: z.string(),
    previous_ends_at: z.string(),
    previous_slot_id: z.string(),
    previous_starts_at: z.string(),
    reason: z.string(),
  }),
  DOCUMENT_VERSION_ADDED: z.object({
    document_group_id: z.string(),
    document_type: z.enum([
      'CONFIRMATION',
      'FORM',
      'NOTICE',
      'PROTOCOL',
      'OTHER',
    ]),
    document_version_id: z.string(),
    mime_type: z.string(),
    original_filename: z.string(),
    replaced_version_id: z.string().nullable().optional(),
    size_bytes: z.number().int().positive(),
    storage_key: z.string().optional(),
    version_number: z.number().int().positive(),
    visible_to_citizen: z.boolean(),
  }),
} as const

export type AppointmentEventPayloadType =
  keyof typeof appointmentEventPayloadSchemas
export type AppointmentEventPayload<TType extends AppointmentEventPayloadType> =
  z.infer<(typeof appointmentEventPayloadSchemas)[TType]>

/** Converts one generated event while preserving unknown future event types. */
export function mapAppointmentEventResponse(
  response: AppointmentEventResponse,
): AppointmentEventRecord {
  return {
    actor: response.actor
      ? { id: response.actor.id, label: response.actor.display_name }
      : null,
    eventType: response.event_type,
    id: response.id,
    occurredAt: response.occurred_at,
    payload: { ...response.payload },
    sequenceNumber: response.sequence_number,
  }
}

/** Maps one newest-first backend event page for incremental history loading. */
export function mapAppointmentEventPage(
  response: PaginatedResponseAppointmentEventResponse,
): PageModel<AppointmentEventRecord> {
  return mapApiPage(response, mapAppointmentEventResponse)
}

/** Validates one known payload without allowing malformed history to break the page. */
export function parseAppointmentEventPayload<
  TType extends AppointmentEventPayloadType,
>(
  event: AppointmentEventRecord,
  eventType: TType,
): AppointmentEventPayload<TType> | null {
  const schema = appointmentEventPayloadSchemas[
    eventType
  ] as unknown as z.ZodType<AppointmentEventPayload<TType>>
  const result = schema.safeParse(event.payload)
  return result.success ? result.data : null
}
