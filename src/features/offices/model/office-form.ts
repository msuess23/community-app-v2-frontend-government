import type { FieldPath, UseFormSetError } from 'react-hook-form'
import { z } from 'zod'

import { isApiError } from '@/api/client/api-error'
import type {
  AddressCreate,
  AddressUpdate,
  OfficeCreate,
  OfficeUpdate,
  OpeningHours,
} from '@/api/generated/models'
import {
  OFFICE_WEEKDAYS,
  type OfficeAddress,
  type OfficeOpeningHours,
  type OfficeRecord,
  type OfficeWeekday,
} from '@/features/offices/model/office-model'
import {
  changeReasonSchema,
  normalizeChangeReason,
} from '@/shared/forms/change-reason'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const EMPTY_INTERVAL = { end: '', start: '' } as const

export const OFFICE_OPENING_DAY_MODES = [
  'unspecified',
  'closed',
  'open',
] as const

export type OfficeOpeningDayMode = (typeof OFFICE_OPENING_DAY_MODES)[number]

export type OfficeTimeIntervalFormValues = {
  end: string
  start: string
}

export type OfficeOpeningDayFormValues = {
  intervals: OfficeTimeIntervalFormValues[]
  mode: OfficeOpeningDayMode
}

export type OfficeAddressFormValues = {
  city: string
  enabled: boolean
  houseNumber: string
  street: string
  zipCode: string
}

export type OfficeFormValues = {
  address: OfficeAddressFormValues
  changeReason: string
  contactEmail: string
  description: string
  name: string
  openingHours: Record<OfficeWeekday, OfficeOpeningDayFormValues>
  phone: string
  services: Array<{ value: string }>
}

/** Creates validation shared by office creation and administrative editing. */
export function createOfficeFormSchema(mode: 'create' | 'edit') {
  return z
    .object({
      address: z.object({
        city: z.string(),
        enabled: z.boolean(),
        houseNumber: z.string(),
        street: z.string(),
        zipCode: z.string(),
      }),
      changeReason: mode === 'edit' ? changeReasonSchema : z.string(),
      contactEmail: z
        .string()
        .trim()
        .max(254, 'Die E-Mail-Adresse darf höchstens 254 Zeichen haben.')
        .refine(
          (value) => !value || z.string().email().safeParse(value).success,
          'Gib eine gültige E-Mail-Adresse ein.',
        ),
      description: z
        .string()
        .trim()
        .max(1000, 'Die Beschreibung darf höchstens 1000 Zeichen haben.'),
      name: z
        .string()
        .trim()
        .min(3, 'Der Name muss mindestens drei Zeichen haben.')
        .max(150, 'Der Name darf höchstens 150 Zeichen haben.'),
      openingHours: createOpeningHoursSchema(),
      phone: z
        .string()
        .trim()
        .max(50, 'Die Telefonnummer darf höchstens 50 Zeichen haben.')
        .refine(
          (value) => !value || /^\+?[0-9\s\-()]+$/.test(value),
          'Die Telefonnummer darf nur Ziffern, Leerzeichen, Pluszeichen, Bindestriche und Klammern enthalten.',
        ),
      services: z
        .array(
          z.object({
            value: z
              .string()
              .trim()
              .min(1, 'Die Leistung darf nicht leer sein.')
              .max(100, 'Die Leistung darf höchstens 100 Zeichen haben.'),
          }),
        )
        .max(50, 'Es können höchstens 50 Leistungen hinterlegt werden.'),
    })
    .superRefine((values, context) => {
      validateAddress(values.address, context)
      validateServiceDuplicates(values.services, context)
      validateOpeningHours(values.openingHours, context)
    })
}

/** Creates stable empty values for a new office. */
export function createEmptyOfficeFormValues(): OfficeFormValues {
  return {
    address: {
      city: '',
      enabled: false,
      houseNumber: '',
      street: '',
      zipCode: '',
    },
    changeReason: '',
    contactEmail: '',
    description: '',
    name: '',
    openingHours: createEmptyOpeningHoursValues(),
    phone: '',
    services: [],
  }
}

/** Maps a persisted office into one complete edit-session form state. */
export function toOfficeFormValues(office: OfficeRecord): OfficeFormValues {
  return {
    address: office.address
      ? {
          city: office.address.city,
          enabled: true,
          houseNumber: office.address.houseNumber,
          street: office.address.street,
          zipCode: office.address.zipCode,
        }
      : createEmptyOfficeFormValues().address,
    changeReason: '',
    contactEmail: office.contactEmail ?? '',
    description: office.description ?? '',
    name: office.name,
    openingHours: toOpeningHoursFormValues(office.openingHours),
    phone: office.phone ?? '',
    services: office.services.map((value) => ({ value })),
  }
}

/** Converts validated creation values into the generated transport contract. */
export function toOfficeCreate(values: OfficeFormValues): OfficeCreate {
  return {
    address: values.address.enabled ? toAddressCreate(values.address) : null,
    contact_email: normalizeOptionalText(values.contactEmail),
    description: normalizeOptionalText(values.description),
    name: normalizeRequiredText(values.name),
    opening_hours: toOpeningHoursRequest(values.openingHours),
    phone: normalizeOptionalText(values.phone),
    services: normalizeServices(values.services),
  }
}

/** Builds a minimal partial update while preserving coordinates not exposed by the form. */
export function toOfficeUpdate(
  values: OfficeFormValues,
  office: OfficeRecord,
): OfficeUpdate {
  const update: OfficeUpdate = {
    change_reason: normalizeChangeReason(values.changeReason),
  }
  const normalizedName = normalizeRequiredText(values.name)
  const normalizedDescription = normalizeOptionalText(values.description)
  const normalizedEmail = normalizeOptionalText(values.contactEmail)
  const normalizedPhone = normalizeOptionalText(values.phone)
  const services = normalizeServices(values.services)
  const openingHours = toOpeningHoursRequest(values.openingHours)

  if (normalizedName !== office.name) {
    update.name = normalizedName
  }
  if (normalizedDescription !== office.description) {
    update.description = normalizedDescription
  }
  if (normalizedEmail !== office.contactEmail) {
    update.contact_email = normalizedEmail
  }
  if (normalizedPhone !== office.phone) {
    update.phone = normalizedPhone
  }
  if (!areStringArraysEqual(services, office.services)) {
    update.services = services
  }
  if (!areOpeningHoursEqual(openingHours, office.openingHours)) {
    update.opening_hours = openingHours
  }

  const addressUpdate = toAddressUpdate(values.address, office.address)
  if (addressUpdate.wasSupplied) {
    update.address = addressUpdate.value
  }

  return update
}

/** Returns whether normalized master data differs from the current server projection. */
export function hasOfficeChanges(
  values: OfficeFormValues,
  office: OfficeRecord,
): boolean {
  return Object.keys(
    toOfficeUpdate({ ...values, changeReason: 'comparison' }, office),
  ).some((key) => key !== 'change_reason')
}

/** Maps backend validation and domain failures to actionable office form locations. */
export function applyOfficeSubmissionError(
  error: unknown,
  setError: UseFormSetError<OfficeFormValues>,
): FormErrorSummaryItem[] {
  if (!isApiError(error)) {
    return [
      {
        message:
          'Die Behördendaten konnten nicht gespeichert werden. Versuche es erneut.',
      },
    ]
  }

  if (error.errorCode === 'OFFICE_INACTIVE') {
    return [
      {
        message:
          'Eine deaktivierte Behörde kann nicht mehr bearbeitet werden.',
      },
    ]
  }
  if (error.errorCode === 'OFFICE_NOT_FOUND') {
    return [{ message: 'Die Behörde wurde nicht gefunden.' }]
  }

  let hasUnmappedDetail = false
  let mappedFieldError = false

  for (const detail of error.details) {
    const field = mapOfficeErrorField(detail.field)
    if (!field) {
      hasUnmappedDetail = true
      continue
    }

    mappedFieldError = true
    setError(field, {
      message: translateOfficeFieldMessage(detail.field, detail.message),
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
          ? 'Du darfst Behördendaten nicht administrativ ändern.'
          : error.status === 0
            ? error.message
            : 'Die Behördendaten konnten nicht gespeichert werden. Prüfe die Eingaben und versuche es erneut.',
    },
  ]
}

function createOpeningHoursSchema() {
  const daySchema = z.object({
    intervals: z.array(
      z.object({
        end: z.string(),
        start: z.string(),
      }),
    ),
    mode: z.enum(OFFICE_OPENING_DAY_MODES),
  })

  return z.object(
    Object.fromEntries(
      OFFICE_WEEKDAYS.map(({ key }) => [key, daySchema]),
    ) as Record<OfficeWeekday, typeof daySchema>,
  )
}

function validateAddress(
  address: OfficeAddressFormValues,
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

function validateServiceDuplicates(
  services: OfficeFormValues['services'],
  context: z.RefinementCtx,
): void {
  const seen = new Map<string, number>()

  services.forEach((service, index) => {
    const key = normalizeRequiredText(service.value).toLocaleLowerCase('de-DE')
    const duplicateOf = seen.get(key)
    if (key && duplicateOf !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Diese Leistung ist bereits eingetragen.',
        path: ['services', index, 'value'],
      })
      return
    }
    if (key) {
      seen.set(key, index)
    }
  })
}

function validateOpeningHours(
  openingHours: OfficeFormValues['openingHours'],
  context: z.RefinementCtx,
): void {
  for (const { key } of OFFICE_WEEKDAYS) {
    const day = openingHours[key]
    if (day.mode !== 'open') {
      continue
    }

    if (day.intervals.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Füge mindestens ein Zeitintervall hinzu.',
        path: ['openingHours', key, 'mode'],
      })
      continue
    }

    const normalizedIntervals: Array<{
      end: number
      index: number
      start: number
    }> = []

    day.intervals.forEach((interval, index) => {
      const start = timeToMinutes(interval.start)
      const end = timeToMinutes(interval.end)

      if (start === null) {
        context.addIssue({
          code: 'custom',
          message: 'Gib eine gültige Startzeit ein.',
          path: ['openingHours', key, 'intervals', index, 'start'],
        })
      }
      if (end === null) {
        context.addIssue({
          code: 'custom',
          message: 'Gib eine gültige Endzeit ein.',
          path: ['openingHours', key, 'intervals', index, 'end'],
        })
      }
      if (start !== null && end !== null) {
        if (start >= end) {
          context.addIssue({
            code: 'custom',
            message: 'Die Endzeit muss nach der Startzeit liegen.',
            path: ['openingHours', key, 'intervals', index, 'end'],
          })
        } else {
          normalizedIntervals.push({ end, index, start })
        }
      }
    })

    normalizedIntervals.sort((left, right) => left.start - right.start)
    for (let index = 1; index < normalizedIntervals.length; index += 1) {
      const previous = normalizedIntervals[index - 1]
      const current = normalizedIntervals[index]
      if (previous.end > current.start) {
        context.addIssue({
          code: 'custom',
          message: 'Dieses Zeitintervall überschneidet sich mit einem anderen.',
          path: ['openingHours', key, 'intervals', current.index, 'start'],
        })
      }
    }
  }
}

function createEmptyOpeningHoursValues(): OfficeFormValues['openingHours'] {
  const openingHours = {} as OfficeFormValues['openingHours']

  for (const { key } of OFFICE_WEEKDAYS) {
    openingHours[key] = { intervals: [], mode: 'unspecified' }
  }

  return openingHours
}

function toOpeningHoursFormValues(
  openingHours: OfficeOpeningHours | null,
): OfficeFormValues['openingHours'] {
  const result = createEmptyOpeningHoursValues()

  for (const { key } of OFFICE_WEEKDAYS) {
    const value = openingHours?.[key]
    if (!value) {
      continue
    }
    if (value.toLocaleLowerCase('de-DE') === 'geschlossen') {
      result[key] = { intervals: [], mode: 'closed' }
      continue
    }

    const intervals = value.split(',').flatMap((part) => {
      const [start, end] = part.trim().split('-')
      return start && end ? [{ end, start }] : []
    })
    result[key] = {
      intervals: intervals.length > 0 ? intervals : [{ ...EMPTY_INTERVAL }],
      mode: 'open',
    }
  }

  return result
}

function toOpeningHoursRequest(
  openingHours: OfficeFormValues['openingHours'],
): OpeningHours | null {
  const result: OpeningHours = {}

  for (const { key } of OFFICE_WEEKDAYS) {
    const day = openingHours[key]
    if (day.mode === 'closed') {
      result[key] = 'geschlossen'
    } else if (day.mode === 'open') {
      result[key] = [...day.intervals]
        .sort((left, right) => left.start.localeCompare(right.start))
        .map((interval) => `${interval.start}-${interval.end}`)
        .join(', ')
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

function toAddressCreate(address: OfficeAddressFormValues): AddressCreate {
  return {
    city: normalizeRequiredText(address.city),
    house_number: normalizeRequiredText(address.houseNumber),
    street: normalizeRequiredText(address.street),
    zip_code: normalizeRequiredText(address.zipCode),
  }
}

function toAddressUpdate(
  values: OfficeAddressFormValues,
  currentAddress: OfficeAddress | null,
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

function normalizeServices(
  services: OfficeFormValues['services'],
): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  for (const service of services) {
    const value = normalizeRequiredText(service.value)
    const key = value.toLocaleLowerCase('de-DE')
    if (value && !seen.has(key)) {
      result.push(value)
      seen.add(key)
    }
  }

  return result
}

function normalizeRequiredText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeOptionalText(value: string): string | null {
  return normalizeRequiredText(value) || null
}

function areStringArraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function areOpeningHoursEqual(
  request: OpeningHours | null,
  current: OfficeOpeningHours | null,
): boolean {
  for (const { key } of OFFICE_WEEKDAYS) {
    if ((request?.[key] ?? null) !== (current?.[key] ?? null)) {
      return false
    }
  }
  return true
}

function timeToMinutes(value: string): number | null {
  if (!TIME_PATTERN.test(value)) {
    return null
  }
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function mapOfficeErrorField(
  rawField: string | undefined,
): FieldPath<OfficeFormValues> | null {
  if (!rawField) {
    return null
  }

  const field = rawField.replace(/^body\./, '')
  const aliases: Record<string, FieldPath<OfficeFormValues>> = {
    change_reason: 'changeReason',
    contact_email: 'contactEmail',
    description: 'description',
    name: 'name',
    phone: 'phone',
    services: 'services',
    street: 'address.street',
    house_number: 'address.houseNumber',
    zip_code: 'address.zipCode',
    city: 'address.city',
    'address.street': 'address.street',
    'address.house_number': 'address.houseNumber',
    'address.zip_code': 'address.zipCode',
    'address.city': 'address.city',
  }
  if (aliases[field]) {
    return aliases[field]
  }

  const serviceMatch = field.match(/^services\.(\d+)$/)
  if (serviceMatch) {
    return `services.${serviceMatch[1]}.value` as FieldPath<OfficeFormValues>
  }

  const openingMatch = field.match(
    /^opening_hours\.(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/,
  )
  if (openingMatch) {
    return `openingHours.${openingMatch[1] as OfficeWeekday}.mode` as FieldPath<
      OfficeFormValues
    >
  }

  return null
}

function translateOfficeFieldMessage(
  field: string | undefined,
  message: string,
): string {
  if (field?.startsWith('opening_hours')) {
    return 'Prüfe die Zeitintervalle dieses Wochentags.'
  }
  if (
    field === 'street' ||
    field === 'house_number' ||
    field === 'zip_code' ||
    field === 'city'
  ) {
    return 'Dieses Feld wird für eine vollständige Adresse benötigt.'
  }
  return message
}
