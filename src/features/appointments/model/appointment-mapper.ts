import type {
  AppointmentFilterOptionsResponse,
  AppointmentResponse,
  PaginatedResponseAppointmentResponse,
} from '@/api/generated/models'
import { mapApiPage, type PageModel } from '@/api/contract/pagination'
import type {
  AppointmentOfficeReference,
  AppointmentRecord,
  AppointmentTicketReference,
  AppointmentUserReference,
} from '@/features/appointments/model/appointment-model'

export type AppointmentFilterOptions = Readonly<{
  citizens: readonly AppointmentUserReference[]
  tickets: readonly AppointmentTicketReference[]
}>

/** Converts one generated appointment projection into the feature read model. */
export function mapAppointmentResponse(
  response: AppointmentResponse,
): AppointmentRecord {
  return {
    allowedActions: response.allowed_actions ?? [],
    cancelledAt: response.cancelled_at ?? null,
    citizen: mapAppointmentUserReference(response.citizen),
    completedAt: response.completed_at ?? null,
    createdAt: response.created_at,
    currentSlotId: response.current_slot_id,
    endsAt: response.ends_at,
    id: response.id,
    office: mapAppointmentOfficeReference(response.office),
    reason: response.reason ?? null,
    startsAt: response.starts_at,
    status: response.status,
    ticket: response.ticket
      ? mapAppointmentTicketReference(response.ticket)
      : null,
    updatedAt: response.updated_at,
    version: response.version,
  }
}

/** Converts the backend page envelope and every current appointment projection. */
export function mapAppointmentPage(
  response: PaginatedResponseAppointmentResponse,
): PageModel<AppointmentRecord> {
  return mapApiPage(response, mapAppointmentResponse)
}

/** Converts backend-scoped filter values without exposing generated field names. */
export function mapAppointmentFilterOptions(
  response: AppointmentFilterOptionsResponse,
): AppointmentFilterOptions {
  return {
    citizens: (response.citizens ?? []).map(mapAppointmentUserReference),
    tickets: (response.tickets ?? []).map(mapAppointmentTicketReference),
  }
}

function mapAppointmentOfficeReference(
  response: AppointmentResponse['office'],
): AppointmentOfficeReference {
  return { id: response.id, name: response.name }
}

function mapAppointmentUserReference(
  response: AppointmentResponse['citizen'],
): AppointmentUserReference {
  return { displayName: response.display_name, id: response.id }
}

function mapAppointmentTicketReference(
  response: NonNullable<AppointmentResponse['ticket']>,
): AppointmentTicketReference {
  return { canView: response.can_view, id: response.id, title: response.title }
}
