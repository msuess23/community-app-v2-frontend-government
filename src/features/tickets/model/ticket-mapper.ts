import type {
  AddressResponse,
  OfficeReference,
  PaginatedResponseTicketInternalResponse,
  TicketInternalDetailResponse,
  TicketInternalResponse,
  TicketStatusResponse,
  UserReference,
} from '@/api/generated/models'
import { mapApiPage, type PageModel } from '@/api/contract/pagination'
import {
  getTicketUserReferenceLabel,
  type TicketAddress,
  type TicketOfficeReference,
  type TicketRecord,
  type TicketStatusRecord,
  type TicketUserReference,
} from '@/features/tickets/model/ticket-model'

/** Converts one generated internal ticket DTO into the feature read model. */
export function mapTicketInternalResponse(
  response: TicketInternalResponse,
): TicketRecord {
  return mapTicketRecord(response, [])
}

/** Converts one generated ticket detail DTO including its current commands. */
export function mapTicketInternalDetailResponse(
  response: TicketInternalDetailResponse,
): TicketRecord {
  return mapTicketRecord(response, response.allowed_actions ?? [])
}

/** Converts the backend page envelope and every contained ticket projection. */
export function mapTicketPage(
  response: PaginatedResponseTicketInternalResponse,
): PageModel<TicketRecord> {
  return mapApiPage(response, mapTicketInternalResponse)
}

function mapTicketRecord(
  response: TicketInternalResponse | TicketInternalDetailResponse,
  allowedActions: TicketRecord['allowedActions'],
): TicketRecord {
  return {
    address: response.address ? mapTicketAddress(response.address) : null,
    allowedActions,
    canManageImages: response.can_manage_images ?? false,
    category: response.category,
    createdAt: response.created_at,
    creator: mapRequiredTicketUserReference(response.creator),
    currentAssignee: mapTicketUserReference(response.current_assignee),
    currentStatus: response.current_status
      ? mapTicketStatusResponse(response.current_status)
      : null,
    description: response.description ?? null,
    id: response.id,
    imageUrl: response.image_url ?? null,
    office: mapTicketOfficeReference(response.office),
    primaryOfficer: mapTicketUserReference(response.primary_officer),
    returnToUser: mapTicketUserReference(response.return_to_user),
    title: response.title,
    updatedAt: response.updated_at,
    version: response.version,
    visibility: response.visibility,
    workflowState: response.workflow_state,
  }
}

/** Converts the current public status without exposing generated snake-case fields. */
export function mapTicketStatusResponse(
  response: TicketStatusResponse,
): TicketStatusRecord {
  return {
    createdAt: response.created_at,
    id: response.id,
    message: response.message ?? null,
    status: response.status,
  }
}

function mapTicketAddress(response: AddressResponse): TicketAddress {
  return {
    city: response.city,
    houseNumber: response.house_number,
    latitude: response.latitude ?? null,
    longitude: response.longitude ?? null,
    street: response.street,
    zipCode: response.zip_code,
  }
}

function mapRequiredTicketUserReference(
  response: UserReference,
): TicketUserReference {
  return {
    displayName: getTicketUserReferenceLabel(response.display_name),
    id: response.id,
  }
}

function mapTicketUserReference(
  response: UserReference | null | undefined,
): TicketUserReference | null {
  return response
    ? {
        displayName: getTicketUserReferenceLabel(response.display_name),
        id: response.id,
      }
    : null
}

function mapTicketOfficeReference(
  response: OfficeReference | null | undefined,
): TicketOfficeReference | null {
  return response
    ? {
        id: response.id,
        name: response.name,
      }
    : null
}
