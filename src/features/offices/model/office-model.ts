/** Lists weekdays in the order used by German authority opening-hour views. */
export const OFFICE_WEEKDAYS = [
  { key: 'monday', label: 'Montag' },
  { key: 'tuesday', label: 'Dienstag' },
  { key: 'wednesday', label: 'Mittwoch' },
  { key: 'thursday', label: 'Donnerstag' },
  { key: 'friday', label: 'Freitag' },
  { key: 'saturday', label: 'Samstag' },
  { key: 'sunday', label: 'Sonntag' },
] as const

export type OfficeWeekday = (typeof OFFICE_WEEKDAYS)[number]['key']

/** Represents one persisted office address after crossing the transport boundary. */
export type OfficeAddress = Readonly<{
  city: string
  houseNumber: string
  id: string
  latitude: number | null
  longitude: number | null
  street: string
  zipCode: string
}>

/** Represents normalized opening-hour values for one complete week. */
export type OfficeOpeningHours = Readonly<
  Record<OfficeWeekday, string | null>
>

/** Represents one office after generated transport DTOs crossed the feature boundary. */
export type OfficeRecord = Readonly<{
  address: OfficeAddress | null
  contactEmail: string | null
  createdAt: string
  deactivatedAt: string | null
  description: string | null
  id: string
  isActive: boolean
  name: string
  openingHours: OfficeOpeningHours | null
  phone: string | null
  services: readonly string[]
}>

/** Returns a readable place label that helps distinguish offices with equal names. */
export function getOfficeLocationLabel(office: OfficeRecord): string {
  return office.address?.city ?? 'Keine Adresse hinterlegt'
}


/** Creates a telephone URI without presentation characters. */
export function getOfficeTelephoneHref(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

/** Builds the accessible label used by compact directory cards. */
export function getOfficeDisplayLabel(office: OfficeRecord): string {
  const qualifier =
    office.address?.city ?? office.contactEmail ?? office.phone ?? 'ohne Kontaktangabe'

  return `${office.name}, ${qualifier}`
}
