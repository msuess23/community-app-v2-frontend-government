import type { FieldPath, UseFormSetError } from 'react-hook-form'
import { z } from 'zod'

import { isApiError } from '@/api/client/api-error'
import type {
  AddressCreate,
  AddressUpdate,
  InfoCreateRequest,
  InfoUpdateRequest,
} from '@/api/generated/models'
import type { AuthUser } from '@/auth/auth-types'
import {
  INFO_CATEGORIES,
  type InfoAddress,
  type InfoRecord,
} from '@/features/infos/model/info-model'
import {
  isValidLocalDateTime,
  toLocalDateTimeInputValue,
  toZonedDateTimeIso,
} from '@/shared/format/local-date-time'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

export type InfoAddressFormValues = {
  city: string
  enabled: boolean
  houseNumber: string
  street: string
  zipCode: string
}

export type InfoFormValues = {
  address: InfoAddressFormValues
  category: (typeof INFO_CATEGORIES)[number]
  description: string
  endsAt: string
  officeId: string
  startsAt: string
  title: string
}

/** Creates validation shared by Info creation and in-place editing. */
export function createInfoFormSchema() {
  return z
    .object({
      address: z.object({
        city: z.string(),
        enabled: z.boolean(),
        houseNumber: z.string(),
        street: z.string(),
        zipCode: z.string(),
      }),
      category: z.enum(INFO_CATEGORIES),
      description: z
        .string()
        .trim()
        .max(5000, 'Die Beschreibung darf höchstens 5000 Zeichen haben.'),
      endsAt: z.string(),
      officeId: z.string(),
      startsAt: z.string(),
      title: z
        .string()
        .trim()
        .min(3, 'Der Titel muss mindestens drei Zeichen haben.')
        .max(255, 'Der Titel darf höchstens 255 Zeichen haben.'),
    })
    .superRefine((values, context) => {
      validateDateTime('startsAt', values.startsAt, 'Beginn', context)
      validateDateTime('endsAt', values.endsAt, 'Ende', context)
      validateAddress(values.address, context)

      if (
        isValidLocalDateTime(values.startsAt) &&
        isValidLocalDateTime(values.endsAt) &&
        Date.parse(toZonedDateTimeIso(values.endsAt)) <=
          Date.parse(toZonedDateTimeIso(values.startsAt))
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Das Ende muss nach dem Beginn liegen.',
          path: ['endsAt'],
        })
      }
    })
}

/** Creates stable empty values for a new Info workflow. */
export function createEmptyInfoFormValues(user: AuthUser): InfoFormValues {
  return {
    address: createEmptyAddressValues(),
    category: 'ANNOUNCEMENT',
    description: '',
    endsAt: '',
    officeId: user.role === 'ADMIN' ? '' : (user.officeId ?? ''),
    startsAt: '',
    title: '',
  }
}

/** Maps one persisted Info into a complete edit-session form state. */
export function toInfoFormValues(info: InfoRecord): InfoFormValues {
  return {
    address: info.address
      ? {
          city: info.address.city,
          enabled: true,
          houseNumber: info.address.houseNumber,
          street: info.address.street,
          zipCode: info.address.zipCode,
        }
      : createEmptyAddressValues(),
    category: info.category,
    description: info.description ?? '',
    endsAt: toLocalDateTimeInputValue(info.endsAt),
    officeId: info.officeId ?? '',
    startsAt: toLocalDateTimeInputValue(info.startsAt),
    title: info.title,
  }
}

/** Converts validated creation values into the generated transport contract. */
export function toInfoCreate(
  values: InfoFormValues,
  user: AuthUser,
): InfoCreateRequest {
  const officeId =
    user.role === 'ADMIN' ? normalizeOfficeId(values.officeId) : user.officeId

  if (user.role !== 'ADMIN' && officeId === null) {
    throw new Error('An office assignment is required for Info creation.')
  }

  return {
    address: values.address.enabled ? toAddressCreate(values.address) : null,
    category: values.category,
    description: normalizeOptionalText(values.description),
    ends_at: toZonedDateTimeIso(values.endsAt),
    office_id: officeId,
    starts_at: toZonedDateTimeIso(values.startsAt),
    title: normalizeRequiredText(values.title),
  }
}

/** Builds the minimal partial PUT payload accepted by the backend. */
export function toInfoUpdate(
  values: InfoFormValues,
  info: InfoRecord,
  user: AuthUser,
): InfoUpdateRequest {
  const update: InfoUpdateRequest = {}
  const title = normalizeRequiredText(values.title)
  const description = normalizeOptionalText(values.description)
  const startsAt = toZonedDateTimeIso(values.startsAt)
  const endsAt = toZonedDateTimeIso(values.endsAt)

  if (title !== info.title) {
    update.title = title
  }
  if (description !== info.description) {
    update.description = description
  }
  if (values.category !== info.category) {
    update.category = values.category
  }
  if (values.startsAt !== toLocalDateTimeInputValue(info.startsAt)) {
    update.starts_at = startsAt
  }
  if (values.endsAt !== toLocalDateTimeInputValue(info.endsAt)) {
    update.ends_at = endsAt
  }

  if (user.role === 'ADMIN') {
    const officeId = normalizeOfficeId(values.officeId)
    if (officeId !== info.officeId) {
      update.office_id = officeId
    }
  }

  const addressUpdate = toAddressUpdate(values.address, info.address)
  if (addressUpdate.wasSupplied) {
    update.address = addressUpdate.value
  }

  return update
}

/** Returns whether normalized form data differs from the current server projection. */
export function hasInfoChanges(
  values: InfoFormValues,
  info: InfoRecord,
  user: AuthUser,
): boolean {
  try {
    return Object.keys(toInfoUpdate(values, info, user)).length > 0
  } catch {
    // Invalid intermediate datetime values remain dirty without crashing rendering.
    return true
  }
}

/** Maps backend validation and domain failures to actionable form locations. */
export function applyInfoSubmissionError(
  error: unknown,
  setError: UseFormSetError<InfoFormValues>,
): FormErrorSummaryItem[] {
  if (!isApiError(error)) {
    return [
      {
        message:
          'Die Mitteilung konnte nicht gespeichert werden. Versuche es erneut.',
      },
    ]
  }

  if (error.errorCode === 'INFO_NOT_FOUND') {
    return [{ message: 'Die Mitteilung wurde nicht gefunden.' }]
  }
  if (error.errorCode === 'INFO_STATUS_NOT_FOUND') {
    return [
      {
        message:
          'Für diese Mitteilung fehlt der aktuelle Status. Der Datenbestand muss administrativ geprüft werden.',
      },
    ]
  }
  if (error.errorCode === 'INFO_OFFICE_NOT_FOUND') {
    setError('officeId', {
      message: 'Die ausgewählte Behörde wurde nicht gefunden.',
      type: 'server',
    })
    return []
  }
  if (error.errorCode === 'INFO_OFFICE_INACTIVE') {
    setError('officeId', {
      message: 'Die ausgewählte Behörde ist deaktiviert.',
      type: 'server',
    })
    return []
  }
  if (error.errorCode === 'INFO_INVALID_TIME_RANGE') {
    setError('endsAt', {
      message: 'Das Ende muss nach dem Beginn liegen.',
      type: 'server',
    })
    return []
  }
  if (error.errorCode === 'DATE_TIMEZONE_REQUIRED') {
    setError('startsAt', {
      message: 'Beginn und Ende müssen eine gültige Zeitzone enthalten.',
      type: 'server',
    })
    return []
  }

  let hasUnmappedDetail = false
  let mappedFieldError = false

  for (const detail of error.details) {
    const field = mapInfoErrorField(detail.field)
    if (!field) {
      hasUnmappedDetail = true
      continue
    }

    mappedFieldError = true
    setError(field, {
      message: translateInfoFieldMessage(detail.field, detail.message),
      type: 'server',
    })
  }

  if (error.errorCode === 'INCOMPLETE_ADDRESS' && !mappedFieldError) {
    setError('address.street', {
      message: 'Eine neue Adresse muss vollständig angegeben werden.',
      type: 'server',
    })
    mappedFieldError = true
  }

  if (mappedFieldError && !hasUnmappedDetail) {
    return []
  }

  return [
    {
      message:
        error.status === 403
          ? 'Du darfst diese Mitteilung nicht administrativ ändern.'
          : error.status === 0
            ? error.message
            : 'Die Mitteilung konnte nicht gespeichert werden. Prüfe die Eingaben und versuche es erneut.',
    },
  ]
}

function validateDateTime(
  field: 'endsAt' | 'startsAt',
  value: string,
  label: string,
  context: z.RefinementCtx,
): void {
  if (!value) {
    context.addIssue({
      code: 'custom',
      message: `${label} ist erforderlich.`,
      path: [field],
    })
    return
  }

  if (!isValidLocalDateTime(value)) {
    context.addIssue({
      code: 'custom',
      message: `${label} muss ein gültiger lokaler Zeitpunkt sein.`,
      path: [field],
    })
  }
}

function validateAddress(
  address: InfoAddressFormValues,
  context: z.RefinementCtx,
): void {
  if (!address.enabled) {
    return
  }

  const fields = [
    ['street', address.street, 2, 150, 'Straße'],
    ['houseNumber', address.houseNumber, 1, 20, 'Hausnummer'],
    ['zipCode', address.zipCode, 4, 10, 'Postleitzahl'],
    ['city', address.city, 2, 100, 'Ort'],
  ] as const

  for (const [field, rawValue, minimum, maximum, label] of fields) {
    const value = normalizeRequiredText(rawValue)
    if (value.length < minimum) {
      context.addIssue({
        code: 'custom',
        message: `${label} muss mindestens ${
          minimum === 1 ? 'ein Zeichen' : `${minimum} Zeichen`
        } haben.`,
        path: ['address', field],
      })
    } else if (value.length > maximum) {
      context.addIssue({
        code: 'custom',
        message: `${label} darf höchstens ${maximum} Zeichen haben.`,
        path: ['address', field],
      })
    }
  }
}

function createEmptyAddressValues(): InfoAddressFormValues {
  return {
    city: '',
    enabled: false,
    houseNumber: '',
    street: '',
    zipCode: '',
  }
}

function toAddressCreate(address: InfoAddressFormValues): AddressCreate {
  return {
    city: normalizeRequiredText(address.city),
    house_number: normalizeRequiredText(address.houseNumber),
    street: normalizeRequiredText(address.street),
    zip_code: normalizeRequiredText(address.zipCode),
  }
}

function toAddressUpdate(
  values: InfoAddressFormValues,
  currentAddress: InfoAddress | null,
): { value: AddressUpdate | null; wasSupplied: boolean } {
  if (!values.enabled) {
    return currentAddress
      ? { value: null, wasSupplied: true }
      : { value: null, wasSupplied: false }
  }

  const normalized = toAddressCreate(values)
  if (!currentAddress) {
    return { value: normalized, wasSupplied: true }
  }

  const update: AddressUpdate = {}
  if (normalized.street !== currentAddress.street) {
    update.street = normalized.street
  }
  if (normalized.house_number !== currentAddress.houseNumber) {
    update.house_number = normalized.house_number
  }
  if (normalized.zip_code !== currentAddress.zipCode) {
    update.zip_code = normalized.zip_code
  }
  if (normalized.city !== currentAddress.city) {
    update.city = normalized.city
  }

  return {
    value: update,
    wasSupplied: Object.keys(update).length > 0,
  }
}

function mapInfoErrorField(
  rawField: string | undefined,
): FieldPath<InfoFormValues> | null {
  const field = rawField?.replace(/^body\./, '')

  switch (field) {
    case 'title':
      return 'title'
    case 'description':
      return 'description'
    case 'category':
      return 'category'
    case 'office_id':
      return 'officeId'
    case 'starts_at':
      return 'startsAt'
    case 'ends_at':
      return 'endsAt'
    case 'address':
    case 'address.street':
      return 'address.street'
    case 'address.house_number':
      return 'address.houseNumber'
    case 'address.zip_code':
      return 'address.zipCode'
    case 'address.city':
      return 'address.city'
    default:
      return null
  }
}

function translateInfoFieldMessage(
  rawField: string | undefined,
  fallback: string,
): string {
  const field = rawField?.replace(/^body\./, '')

  if (field === 'office_id') {
    return 'Prüfe die ausgewählte Behörde.'
  }
  if (field === 'starts_at' || field === 'ends_at') {
    return 'Gib einen gültigen Zeitpunkt mit Zeitzone an.'
  }
  if (field?.startsWith('address')) {
    return 'Prüfe die vollständigen Adressangaben.'
  }
  return fallback
}

function normalizeRequiredText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized || null
}

function normalizeOfficeId(value: string): string | null {
  const normalized = value.trim()
  return normalized || null
}
