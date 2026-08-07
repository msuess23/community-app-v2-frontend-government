import type { AppointmentStatus } from '@/api/generated/models'
import {
  APPOINTMENT_STATUSES,
  getAppointmentStatusLabel,
  type AppointmentTicketReference,
  type AppointmentUserReference,
} from '@/features/appointments/model/appointment-model'
import type {
  ActiveDataViewFilter,
  DataViewFilterOption,
} from '@/shared/data-view/DataViewFilters'

export const APPOINTMENT_STATUS_FILTER_OPTIONS: readonly DataViewFilterOption[] =
  APPOINTMENT_STATUSES.map((status) => ({
    label: getAppointmentStatusLabel(status),
    value: status,
  }))

export type AppointmentActiveFilterInput = Readonly<{
  citizen: string
  citizens: readonly AppointmentUserReference[]
  createdFrom: string
  createdTo: string
  onSetCitizen: (value: string) => void
  onSetCreatedFrom: (value: string) => void
  onSetCreatedTo: (value: string) => void
  onSetSearch: (value: string) => void
  onSetStartsFrom: (value: string) => void
  onSetStartsTo: (value: string) => void
  onSetStatus: (value: string) => void
  onSetTicket: (value: string) => void
  search: string
  startsFrom: string
  startsTo: string
  status: string
  ticket: string
  tickets: readonly AppointmentTicketReference[]
}>

/** Builds removable filter chips from the URL-owned appointment directory state. */
export function createAppointmentActiveFilters(
  input: AppointmentActiveFilterInput,
): readonly ActiveDataViewFilter[] {
  const filters: ActiveDataViewFilter[] = []
  if (input.search) {
    filters.push({
      key: 'search',
      label: `Suche: ${input.search}`,
      onRemove: () => input.onSetSearch(''),
    })
  }
  if (
    input.status &&
    APPOINTMENT_STATUSES.includes(input.status as AppointmentStatus)
  ) {
    filters.push({
      key: 'status',
      label: `Status: ${getAppointmentStatusLabel(
        input.status as AppointmentStatus,
      )}`,
      onRemove: () => input.onSetStatus(''),
    })
  }
  if (input.citizen) {
    filters.push({
      key: 'citizen',
      label: `Bürger: ${referenceLabel(
        input.citizens,
        input.citizen,
        'Ausgewählte Person',
      )}`,
      onRemove: () => input.onSetCitizen(''),
    })
  }
  if (input.ticket) {
    filters.push({
      key: 'ticket',
      label: `Ticket: ${referenceLabel(
        input.tickets,
        input.ticket,
        'Ausgewähltes Ticket',
      )}`,
      onRemove: () => input.onSetTicket(''),
    })
  }
  for (const [key, value, label, onRemove] of [
    ['startsFrom', input.startsFrom, 'Termin ab', input.onSetStartsFrom],
    ['startsTo', input.startsTo, 'Termin bis', input.onSetStartsTo],
    ['createdFrom', input.createdFrom, 'Erstellt ab', input.onSetCreatedFrom],
    ['createdTo', input.createdTo, 'Erstellt bis', input.onSetCreatedTo],
  ] as const) {
    if (value) {
      filters.push({
        key,
        label: `${label}: ${value}`,
        onRemove: () => onRemove(''),
      })
    }
  }
  return filters
}

/** Converts scoped citizen references into readable native select options. */
export function createAppointmentCitizenFilterOptions(
  citizens: readonly AppointmentUserReference[],
  selectedCitizenId: string,
): readonly DataViewFilterOption[] {
  return keepSelectedOption(
    citizens.map((citizen) => ({
      label: citizen.displayName,
      value: citizen.id,
    })),
    selectedCitizenId,
    'Ausgewählte Person wird geladen',
  )
}

/** Converts scoped ticket references into readable native select options. */
export function createAppointmentTicketFilterOptions(
  tickets: readonly AppointmentTicketReference[],
  selectedTicketId: string,
): readonly DataViewFilterOption[] {
  return keepSelectedOption(
    tickets.map((ticket) => ({ label: ticket.title, value: ticket.id })),
    selectedTicketId,
    'Ausgewähltes Ticket wird geladen',
  )
}

export function getAppointmentFilterOptionsDescription(
  isLoading: boolean,
  hasError: boolean,
): string | undefined {
  if (isLoading) {
    return 'Die verfügbaren Personen und Tickets werden geladen.'
  }
  if (hasError) {
    return 'Personen- und Ticketfilter konnten nicht geladen werden. Suche, Status- und Datumsfilter bleiben verfügbar.'
  }
  return undefined
}

function keepSelectedOption(
  options: readonly DataViewFilterOption[],
  selectedValue: string,
  pendingLabel: string,
): readonly DataViewFilterOption[] {
  return selectedValue &&
    !options.some((option) => option.value === selectedValue)
    ? [...options, { label: pendingLabel, value: selectedValue }]
    : options
}

function referenceLabel(
  references: readonly (AppointmentUserReference | AppointmentTicketReference)[],
  id: string,
  fallback: string,
): string {
  const reference = references.find((item) => item.id === id)
  if (!reference) {
    return fallback
  }
  return 'displayName' in reference ? reference.displayName : reference.title
}
