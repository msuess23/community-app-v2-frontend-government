export type AppointmentFixture = Readonly<{
  allowed_actions: string[]
  cancelled_at: string | null
  citizen: Readonly<{ display_name: string; id: string }>
  citizen_id: string
  completed_at: string | null
  created_at: string
  current_slot_id: string | null
  ends_at: string
  id: string
  office: Readonly<{ id: string; name: string }>
  office_id: string
  reason: string | null
  starts_at: string
  status: string
  ticket: Readonly<{
    can_view: boolean
    id: string
    title: string
  }> | null
  ticket_id: string | null
  updated_at: string
  version: number
}>

export const APPOINTMENT_ID = '00000000-0000-4000-8000-000000000300'
export const SECOND_APPOINTMENT_ID = '00000000-0000-4000-8000-000000000301'
export const APPOINTMENT_OFFICE_ID = '00000000-0000-4000-8000-000000000010'
export const APPOINTMENT_CITIZEN_ID = '00000000-0000-4000-8000-000000000020'
export const APPOINTMENT_TICKET_ID = '00000000-0000-4000-8000-000000000030'

/** Creates the scheduled, ticket-linked appointment used by browser tests. */
export function appointmentResponse(
  overrides: Partial<AppointmentFixture> = {},
): AppointmentFixture {
  return {
    allowed_actions: ['RESCHEDULE', 'CANCEL'],
    cancelled_at: null,
    citizen: {
      display_name: 'Clara Bürgerin',
      id: APPOINTMENT_CITIZEN_ID,
    },
    citizen_id: APPOINTMENT_CITIZEN_ID,
    completed_at: null,
    created_at: '2026-08-01T08:00:00Z',
    current_slot_id: '00000000-0000-4000-8000-000000000040',
    ends_at: '2026-08-12T09:30:00Z',
    id: APPOINTMENT_ID,
    office: { id: APPOINTMENT_OFFICE_ID, name: 'Bürgeramt Mitte' },
    office_id: APPOINTMENT_OFFICE_ID,
    reason: 'Ummeldung des Wohnsitzes',
    starts_at: '2026-08-12T09:00:00Z',
    status: 'SCHEDULED',
    ticket: {
      can_view: true,
      id: APPOINTMENT_TICKET_ID,
      title: 'Anliegen zur Ummeldung',
    },
    ticket_id: APPOINTMENT_TICKET_ID,
    updated_at: '2026-08-02T08:00:00Z',
    version: 1,
    ...overrides,
  }
}

/** Creates a begun appointment for terminal Officer and Manager actions. */
export function startedAppointmentResponse(
  allowedActions: readonly string[] = ['COMPLETE', 'MARK_NO_SHOW'],
): AppointmentFixture {
  return appointmentResponse({
    allowed_actions: [...allowedActions],
    ends_at: '2026-08-05T10:30:00Z',
    starts_at: '2026-08-05T10:00:00Z',
  })
}

export function secondAppointmentResponse(): AppointmentFixture {
  return appointmentResponse({
    allowed_actions: [],
    citizen: {
      display_name: 'Bernd Beispiel',
      id: '00000000-0000-4000-8000-000000000021',
    },
    citizen_id: '00000000-0000-4000-8000-000000000021',
    completed_at: '2026-08-05T10:45:00Z',
    current_slot_id: null,
    ends_at: '2026-08-05T10:30:00Z',
    id: SECOND_APPOINTMENT_ID,
    reason: 'Abholung eines Dokuments',
    starts_at: '2026-08-05T10:00:00Z',
    status: 'COMPLETED',
    ticket: null,
    ticket_id: null,
    updated_at: '2026-08-05T10:45:00Z',
    version: 2,
  })
}

export type AppointmentSlotFixture = Readonly<{
  created_at: string
  ends_at: string
  id: string
  office_id: string
  starts_at: string
  status: string
}>

export const APPOINTMENT_SLOT_ID = '00000000-0000-4000-8000-000000000040'
export const EXPIRED_APPOINTMENT_SLOT_ID =
  '00000000-0000-4000-8000-000000000041'
export const RESCHEDULE_APPOINTMENT_SLOT_ID =
  '00000000-0000-4000-8000-000000000042'

export function appointmentSlotResponse(): AppointmentSlotFixture {
  return {
    created_at: '2026-08-01T08:00:00Z',
    ends_at: '2099-08-20T09:30:00Z',
    id: APPOINTMENT_SLOT_ID,
    office_id: APPOINTMENT_OFFICE_ID,
    starts_at: '2099-08-20T09:00:00Z',
    status: 'AVAILABLE',
  }
}

export function rescheduleAppointmentSlotResponse(): AppointmentSlotFixture {
  return {
    created_at: '2026-08-01T08:00:00Z',
    ends_at: '2099-08-21T10:30:00Z',
    id: RESCHEDULE_APPOINTMENT_SLOT_ID,
    office_id: APPOINTMENT_OFFICE_ID,
    starts_at: '2099-08-21T10:00:00Z',
    status: 'AVAILABLE',
  }
}

export function expiredAppointmentSlotResponse(): AppointmentSlotFixture {
  return {
    created_at: '2020-01-01T08:00:00Z',
    ends_at: '2020-01-02T09:30:00Z',
    id: EXPIRED_APPOINTMENT_SLOT_ID,
    office_id: APPOINTMENT_OFFICE_ID,
    starts_at: '2020-01-02T09:00:00Z',
    status: 'AVAILABLE',
  }
}

export type AppointmentDocumentFixture = Readonly<{
  appointment_id: string
  document_group_id: string
  document_type: string
  id: string
  is_current: boolean
  mime_type: string
  original_filename: string
  replaced_version_id: string | null
  size_bytes: number
  uploaded_at: string
  url: string
  version_number: number
  visible_to_citizen: boolean
}>

export const APPOINTMENT_DOCUMENT_GROUP_ID =
  '00000000-0000-4000-8000-000000000600'
export const APPOINTMENT_DOCUMENT_VERSION_ID =
  '00000000-0000-4000-8000-000000000601'

export function appointmentDocumentResponse(
  overrides: Partial<AppointmentDocumentFixture> = {},
): AppointmentDocumentFixture {
  return {
    appointment_id: APPOINTMENT_ID,
    document_group_id: APPOINTMENT_DOCUMENT_GROUP_ID,
    document_type: 'NOTICE',
    id: APPOINTMENT_DOCUMENT_VERSION_ID,
    is_current: true,
    mime_type: 'application/pdf',
    original_filename: 'terminhinweis-v2.pdf',
    replaced_version_id: '00000000-0000-4000-8000-000000000602',
    size_bytes: 2048,
    uploaded_at: '2026-08-05T10:00:00Z',
    url: `/api/v1/appointments/${APPOINTMENT_ID}/documents/${APPOINTMENT_DOCUMENT_VERSION_ID}/content`,
    version_number: 2,
    visible_to_citizen: false,
    ...overrides,
  }
}
