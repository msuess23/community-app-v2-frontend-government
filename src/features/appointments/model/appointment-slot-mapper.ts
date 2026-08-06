import type {
  AppointmentSlotResponse,
  PaginatedResponseAppointmentSlotResponse,
} from '@/api/generated/models'
import { mapApiPage, type PageModel } from '@/api/contract/pagination'
import type { AppointmentSlotRecord } from '@/features/appointments/model/appointment-slot-model'

/** Converts one generated slot response into the feature-owned read model. */
export function mapAppointmentSlotResponse(
  response: AppointmentSlotResponse,
): AppointmentSlotRecord {
  return {
    createdAt: response.created_at,
    endsAt: response.ends_at,
    id: response.id,
    officeId: response.office_id,
    startsAt: response.starts_at,
    status: response.status,
  }
}

/** Converts the backend page envelope and every appointment-slot projection. */
export function mapAppointmentSlotPage(
  response: PaginatedResponseAppointmentSlotResponse,
): PageModel<AppointmentSlotRecord> {
  return mapApiPage(response, mapAppointmentSlotResponse)
}
