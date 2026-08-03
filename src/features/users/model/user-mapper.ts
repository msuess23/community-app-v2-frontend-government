import type {
  PaginatedResponseUserResponse,
  UserResponse,
} from '@/api/generated/models'
import { mapApiPage, type PageModel } from '@/api/contract/pagination'
import type { UserRecord } from '@/features/users/model/user-model'

/** Converts one generated user DTO into the camel-case model consumed by the UI. */
export function mapUserResponse(response: UserResponse): UserRecord {
  return {
    createdAt: response.metadata.created_at,
    deactivatedAt: response.metadata.deactivated_at ?? null,
    email: response.email,
    firstName: response.first_name,
    id: response.id,
    isActive: response.metadata.is_active,
    lastName: response.last_name,
    officeId: response.office_id ?? null,
    role: response.role,
  }
}

/** Converts the backend page envelope and every contained user at the API boundary. */
export function mapUserPage(
  response: PaginatedResponseUserResponse,
): PageModel<UserRecord> {
  return mapApiPage(response, mapUserResponse)
}
