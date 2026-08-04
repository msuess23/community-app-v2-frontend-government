import type { InfoCategory, InfoStatus } from '@/api/generated/models'

export const INFO_CATEGORIES = [
  'EVENT',
  'CONSTRUCTION',
  'MAINTENANCE',
  'ANNOUNCEMENT',
  'OTHER',
] as const satisfies readonly InfoCategory[]

/** Represents one persisted Info address after crossing the transport boundary. */
export type InfoAddress = Readonly<{
  city: string
  houseNumber: string
  latitude: number | null
  longitude: number | null
  street: string
  zipCode: string
}>

/** Represents one public status entry in the simple Info status history. */
export type InfoStatusRecord = Readonly<{
  createdAt: string
  id: string
  message: string | null
  status: InfoStatus
}>

/** Represents one mutable authority notice after generated DTOs crossed the feature boundary. */
export type InfoRecord = Readonly<{
  address: InfoAddress | null
  category: InfoCategory
  createdAt: string
  currentStatus: InfoStatusRecord
  description: string | null
  endsAt: string
  id: string
  imageUrl: string | null
  officeId: string | null
  startsAt: string
  title: string
  updatedAt: string
}>

const CATEGORY_LABELS: Readonly<Record<InfoCategory, string>> = {
  ANNOUNCEMENT: 'Bekanntmachung',
  CONSTRUCTION: 'Baumaßnahme',
  EVENT: 'Veranstaltung',
  MAINTENANCE: 'Wartung',
  OTHER: 'Sonstiges',
}

const STATUS_LABELS: Readonly<Record<InfoStatus, string>> = {
  ACTIVE: 'Aktiv',
  CANCELLED: 'Abgesagt',
  DONE: 'Abgeschlossen',
  SCHEDULED: 'Geplant',
}

/** Localizes one backend Info category without changing its contract value. */
export function getInfoCategoryLabel(category: InfoCategory): string {
  return CATEGORY_LABELS[category]
}

/** Localizes one backend Info status without inventing additional workflow states. */
export function getInfoStatusLabel(status: InfoStatus): string {
  return STATUS_LABELS[status]
}

/** Returns a compact place label for cards and page summaries. */
export function getInfoLocationLabel(info: InfoRecord): string {
  return info.address?.city ?? 'Kein Ort hinterlegt'
}
