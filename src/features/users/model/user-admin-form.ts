import type { UseFormSetError } from 'react-hook-form'
import { z } from 'zod'

import { isApiError } from '@/api/client/api-error'
import type { AdminUserUpdate } from '@/api/generated/models'
import { ROLES, type AuthUser, type Role } from '@/auth/auth-types'
import type { UserRecord } from '@/features/users/model/user-model'
import { applySubmissionError } from '@/shared/forms/apply-submission-error'
import {
  changeReasonSchema,
  normalizeChangeReason,
} from '@/shared/forms/change-reason'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

const OFFICE_REQUIRED_ROLES = new Set<Role>(['OFFICER', 'MANAGER'])
const OFFICE_FORBIDDEN_ROLES = new Set<Role>(['CITIZEN', 'ADMIN'])

export type UserAdminFormValues = {
  changeReason: string
  firstName: string
  lastName: string
  officeId: string
  role: Role
}

/** Creates validation that mirrors the backend's resulting role and office rules. */
export function createUserAdminFormSchema(
  targetUser: UserRecord,
  currentUser: AuthUser,
) {
  return z
    .object({
      changeReason: changeReasonSchema,
      firstName: z
        .string()
        .trim()
        .min(2, 'Der Vorname muss mindestens zwei Zeichen haben.')
        .max(100, 'Der Vorname darf höchstens 100 Zeichen haben.'),
      lastName: z
        .string()
        .trim()
        .min(2, 'Der Nachname muss mindestens zwei Zeichen haben.')
        .max(100, 'Der Nachname darf höchstens 100 Zeichen haben.'),
      officeId: z.string(),
      role: z.enum(ROLES),
    })
    .superRefine((values, context) => {
      if (targetUser.role !== 'CITIZEN' && values.role === 'CITIZEN') {
        context.addIssue({
          code: 'custom',
          message:
            'Ein Behördenkonto kann nicht wieder in ein Bürgerkonto umgewandelt werden.',
          path: ['role'],
        })
      }

      if (
        targetUser.id === currentUser.id &&
        targetUser.role === 'ADMIN' &&
        values.role !== 'ADMIN'
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Du kannst deine eigene Adminrolle nicht entfernen.',
          path: ['role'],
        })
      }

      if (OFFICE_REQUIRED_ROLES.has(values.role) && !values.officeId) {
        context.addIssue({
          code: 'custom',
          message: 'Für diese Rolle muss eine aktive Behörde ausgewählt werden.',
          path: ['officeId'],
        })
      }
    })
}

/** Creates stable initial values for one administrative edit session. */
export function toUserAdminFormValues(user: UserRecord): UserAdminFormValues {
  return {
    changeReason: '',
    firstName: user.firstName,
    lastName: user.lastName,
    officeId: user.officeId ?? '',
    role: user.role,
  }
}

/** Returns the roles that the backend may accept for the selected target account. */
export function getAssignableRoles(
  targetUser: UserRecord,
  currentUser: AuthUser,
): readonly Role[] {
  if (targetUser.id === currentUser.id && targetUser.role === 'ADMIN') {
    return ['ADMIN']
  }

  if (targetUser.role !== 'CITIZEN') {
    return ROLES.filter((role) => role !== 'CITIZEN')
  }

  return ROLES
}

/** Returns whether the current role needs, permits, or forbids an office assignment. */
export function getOfficeAssignmentMode(
  role: Role,
): 'forbidden' | 'optional' | 'required' {
  if (OFFICE_FORBIDDEN_ROLES.has(role)) {
    return 'forbidden'
  }

  return OFFICE_REQUIRED_ROLES.has(role) ? 'required' : 'optional'
}

/** Returns whether editable account data differs after request normalization. */
export function hasUserAdminChanges(
  values: UserAdminFormValues,
  user: UserRecord,
): boolean {
  const effectiveOfficeId =
    getOfficeAssignmentMode(values.role) === 'forbidden'
      ? null
      : values.officeId || null

  return (
    values.firstName.trim() !== user.firstName ||
    values.lastName.trim() !== user.lastName ||
    values.role !== user.role ||
    effectiveOfficeId !== user.officeId
  )
}

/** Converts validated UI values into the generated administrative request contract. */
export function toAdminUserUpdate(values: UserAdminFormValues): AdminUserUpdate {
  return {
    change_reason: normalizeChangeReason(values.changeReason),
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    office_id:
      getOfficeAssignmentMode(values.role) === 'forbidden'
        ? null
        : values.officeId || null,
    role: values.role,
  }
}

/** Maps domain and validation failures to the most actionable administrative form location. */
export function applyUserAdminSubmissionError(
  error: unknown,
  setError: UseFormSetError<UserAdminFormValues>,
): FormErrorSummaryItem[] {
  if (isApiError(error)) {
    const fieldMessage = USER_ADMIN_FIELD_ERRORS[error.errorCode ?? '']

    if (fieldMessage) {
      setError(fieldMessage.field, {
        message: fieldMessage.message,
        type: 'server',
      })
      return []
    }

    const formMessage = USER_ADMIN_FORM_ERRORS[error.errorCode ?? '']
    if (formMessage) {
      return [{ message: formMessage }]
    }
  }

  return applySubmissionError<UserAdminFormValues>(error, setError, {
    fallbackMessage:
      'Das Benutzerkonto konnte nicht gespeichert werden. Versuche es erneut.',
    fieldAliases: {
      change_reason: 'changeReason',
      changeReason: 'changeReason',
      first_name: 'firstName',
      firstName: 'firstName',
      last_name: 'lastName',
      lastName: 'lastName',
      office_id: 'officeId',
      officeId: 'officeId',
      role: 'role',
    },
    statusMessages: {
      403: 'Du darfst dieses Benutzerkonto nicht administrativ ändern.',
      409: 'Das Konto wird noch in einem aktiven Fachvorgang benötigt.',
    },
  })
}

const USER_ADMIN_FIELD_ERRORS: Readonly<
  Record<string, Readonly<{ field: keyof UserAdminFormValues; message: string }>>
> = {
  OFFICE_INACTIVE: {
    field: 'officeId',
    message: 'Die gewählte Behörde ist nicht mehr aktiv.',
  },
  OFFICE_NOT_FOUND: {
    field: 'officeId',
    message: 'Die gewählte Behörde wurde nicht gefunden.',
  },
  OFFICE_REQUIRED_FOR_ROLE: {
    field: 'officeId',
    message: 'Für diese Rolle muss eine aktive Behörde ausgewählt werden.',
  },
  STAFF_TO_CITIZEN_NOT_ALLOWED: {
    field: 'role',
    message:
      'Ein Behördenkonto kann nicht wieder in ein Bürgerkonto umgewandelt werden.',
  },
}

const USER_ADMIN_FORM_ERRORS: Readonly<Record<string, string>> = {
  USER_HAS_ACTIVE_TICKETS:
    'Die Rolle oder Behördenzuordnung kann nicht geändert werden, solange das Konto in aktiven Anliegen benötigt wird.',
  USER_HAS_SCHEDULED_APPOINTMENTS:
    'Das Bürgerkonto besitzt noch geplante Termine und kann deshalb noch nicht freigeschaltet werden.',
  USER_INACTIVE:
    'Ein deaktiviertes Benutzerkonto kann nicht mehr bearbeitet werden.',
}
