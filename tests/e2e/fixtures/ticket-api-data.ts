export type TicketUserReference = Readonly<{
  display_name: string
  id: string
}>

export type TicketOfficeReference = Readonly<{
  id: string
  name: string
}>

export type TicketWorkflowTarget = Readonly<{
  display_name: string
  id: string
  office: TicketOfficeReference | null
  role: string
}>

export type TicketStatusFixture = Readonly<{
  created_at: string
  id: string
  message: string | null
  status: string
}>

export type TicketInternalDetailFixture = {
  address: Readonly<{
    city: string
    house_number: string
    id: string
    latitude: number | null
    longitude: number | null
    street: string
    zip_code: string
  }> | null
  allowed_actions: string[]
  can_manage_images: boolean
  category: string
  created_at: string
  creator: TicketUserReference
  creator_user_id: string
  current_assignee: TicketUserReference | null
  current_assignee_id: string | null
  current_status: TicketStatusFixture | null
  description: string | null
  id: string
  image_url: string | null
  office: TicketOfficeReference | null
  office_id: string | null
  primary_officer: TicketUserReference | null
  primary_officer_id: string | null
  return_to_user: TicketUserReference | null
  return_to_user_id: string | null
  title: string
  updated_at: string
  version: number
  visibility: string
  workflow_state: string
}

export type TicketWorkflowOptionsFixture = {
  completion_outcomes: string[]
  cosignature_targets: TicketWorkflowTarget[]
  escalation_targets: TicketWorkflowTarget[]
  forward_targets: TicketWorkflowTarget[]
  offices: TicketOfficeReference[]
  primary_officers: TicketWorkflowTarget[]
  ticket_id: string
  version: number
}

export type TicketCommentFixture = Readonly<{
  author: Readonly<{
    author_type: string
    display_name: string
    id: string | null
  }>
  created_at: string
  id: string
  is_internal: boolean
  text: string
  ticket_id: string
}>

export type TicketImageFixture = Readonly<{
  height: number | null
  id: string
  is_active: boolean
  is_cover: boolean
  mime_type: string
  original_filename: string
  removed_at: string | null
  size_bytes: number
  ticket_id: string
  uploaded_at: string
  url: string
  width: number | null
}>

export type TicketEventFixture = Readonly<{
  actor: TicketUserReference
  actor_user_id: string
  event_type: string
  id: string
  occurred_at: string
  payload: Record<string, unknown>
  references: Readonly<{
    offices: TicketOfficeReference[]
    users: TicketUserReference[]
  }>
  sequence_number: number
  ticket_id: string
}>

export type OfficeFixture = Readonly<{
  address: null
  contact_email: string
  description: string | null
  id: string
  metadata: Readonly<{
    created_at: string
    deactivated_at: string | null
    is_active: boolean
  }>
  name: string
  opening_hours: string | null
  phone: string | null
  services: string[]
}>

export const TICKET_ID = '00000000-0000-4000-8000-000000000100'
export const SECOND_TICKET_ID = '00000000-0000-4000-8000-000000000101'
export const TICKET_OFFICE_ID = '00000000-0000-4000-8000-000000000010'

export function ticketWorkflowOptionsResponse(): TicketWorkflowOptionsFixture {
  return {
    completion_outcomes: ['RESOLVED'],
    cosignature_targets: [],
    escalation_targets: [],
    forward_targets: [
      {
        display_name: 'Erika Einsatz',
        id: 'officer-3',
        office: { id: 'office-2', name: 'Ordnungsamt' },
        role: 'OFFICER',
      },
    ],
    offices: [],
    primary_officers: [],
    ticket_id: TICKET_ID,
    version: 4,
  }
}

export function ticketResponse(): TicketInternalDetailFixture {
  return {
    allowed_actions: ['FORWARD', 'COMPLETE'],
    address: {
      city: 'Leipzig',
      house_number: '18',
      id: 'address-1',
      latitude: 51.34,
      longitude: 12.37,
      street: 'Parkstraße',
      zip_code: '04109',
    },
    can_manage_images: true,
    category: 'INFRASTRUCTURE',
    created_at: '2026-08-01T08:00:00Z',
    creator: { display_name: 'Clara Bürgerin', id: 'citizen-1' },
    creator_user_id: 'citizen-1',
    current_assignee: { display_name: 'Olaf Ordnung', id: 'officer-1' },
    current_assignee_id: 'officer-1',
    current_status: {
      created_at: '2026-08-02T08:00:00Z',
      id: 'status-1',
      message: 'Die Bearbeitung wurde aufgenommen.',
      status: 'IN_PROGRESS',
    },
    description: 'Ein tiefes Schlagloch befindet sich am rechten Fahrbahnrand.',
    id: TICKET_ID,
    image_url: null,
    office: { id: TICKET_OFFICE_ID, name: 'Tiefbauamt' },
    office_id: TICKET_OFFICE_ID,
    primary_officer: { display_name: 'Paula Primär', id: 'officer-2' },
    primary_officer_id: 'officer-2',
    return_to_user: null,
    return_to_user_id: null,
    title: 'Schlagloch in der Parkstraße',
    updated_at: '2026-08-02T09:30:00Z',
    version: 4,
    visibility: 'PUBLIC',
    workflow_state: 'IN_PROGRESS',
  }
}

export function secondTicketResponse(): TicketInternalDetailFixture {
  return {
    ...ticketResponse(),
    address: null,
    allowed_actions: [],
    can_manage_images: false,
    category: 'CLEANING',
    current_assignee: null,
    current_assignee_id: null,
    current_status: {
      created_at: '2026-08-03T08:00:00Z',
      id: 'status-2',
      message: null,
      status: 'OPEN',
    },
    description: 'Mehrere Müllsäcke wurden neben dem Container abgestellt.',
    id: SECOND_TICKET_ID,
    office: null,
    office_id: null,
    primary_officer: null,
    primary_officer_id: null,
    title: 'Illegale Müllablagerung',
    updated_at: '2026-08-03T08:00:00Z',
    version: 1,
    visibility: 'PRIVATE',
    workflow_state: 'NEW',
  }
}

export function officeResponse(): OfficeFixture {
  return {
    address: null,
    contact_email: 'tiefbau@example.com',
    description: null,
    id: TICKET_OFFICE_ID,
    metadata: {
      created_at: '2026-01-01T08:00:00Z',
      deactivated_at: null,
      is_active: true,
    },
    name: 'Tiefbauamt',
    opening_hours: null,
    phone: null,
    services: [],
  }
}

export function initialTicketEvents(): TicketEventFixture[] {
  return [
    {
      actor: { display_name: 'Clara Bürgerin', id: 'citizen-1' },
      actor_user_id: 'citizen-1',
      event_type: 'TICKET_SUBMITTED',
      id: 'event-1',
      occurred_at: '2026-08-01T08:00:00Z',
      payload: {
        category: 'INFRASTRUCTURE',
        creator_user_id: 'citizen-1',
        description:
          'Ein tiefes Schlagloch befindet sich am rechten Fahrbahnrand.',
        title: 'Schlagloch in der Parkstraße',
        visibility: 'PUBLIC',
      },
      references: { offices: [], users: [] },
      sequence_number: 1,
      ticket_id: TICKET_ID,
    },
    {
      actor: { display_name: 'Olaf Ordnung', id: 'officer-1' },
      actor_user_id: 'officer-1',
      event_type: 'TICKET_FORWARDED',
      id: 'event-2',
      occurred_at: '2026-08-02T09:30:00Z',
      payload: {
        comment: 'Bitte die Straßensperrung koordinieren.',
        target_user_id: 'officer-3',
      },
      references: {
        offices: [],
        users: [{ display_name: 'Erika Einsatz', id: 'officer-3' }],
      },
      sequence_number: 2,
      ticket_id: TICKET_ID,
    },
  ]
}

export function ticketCommentsResponse(): TicketCommentFixture[] {
  return [
    {
      author: {
        author_type: 'AUTHORITY',
        display_name: 'Olaf Ordnung',
        id: 'officer-1',
      },
      created_at: '2026-08-02T10:00:00Z',
      id: 'comment-1',
      is_internal: true,
      text: 'Interne fachliche Prüfung läuft.',
      ticket_id: TICKET_ID,
    },
    {
      author: {
        author_type: 'CITIZEN',
        display_name: 'Clara Bürgerin',
        id: null,
      },
      created_at: '2026-08-03T10:00:00Z',
      id: 'comment-2',
      is_internal: false,
      text: 'Das Foto wurde am Montag aufgenommen.',
      ticket_id: TICKET_ID,
    },
  ]
}

export function ticketImagesResponse(): TicketImageFixture[] {
  return [
    {
      height: 360,
      id: 'image-active',
      is_active: true,
      is_cover: true,
      mime_type: 'image/jpeg',
      original_filename: 'schlagloch-aktuell.jpg',
      removed_at: null,
      size_bytes: 1200,
      ticket_id: TICKET_ID,
      uploaded_at: '2026-08-02T08:00:00Z',
      url: `/api/v1/tickets/${TICKET_ID}/images/image-active/content`,
      width: 640,
    },
    {
      height: 360,
      id: 'image-secondary',
      is_active: true,
      is_cover: false,
      mime_type: 'image/jpeg',
      original_filename: 'schlagloch-detail.jpg',
      removed_at: null,
      size_bytes: 1150,
      ticket_id: TICKET_ID,
      uploaded_at: '2026-08-02T08:10:00Z',
      url: `/api/v1/tickets/${TICKET_ID}/images/image-secondary/content`,
      width: 640,
    },
    {
      height: 360,
      id: 'image-removed',
      is_active: false,
      is_cover: false,
      mime_type: 'image/jpeg',
      original_filename: 'schlagloch-alt.jpg',
      removed_at: '2026-08-03T08:00:00Z',
      size_bytes: 1100,
      ticket_id: TICKET_ID,
      uploaded_at: '2026-08-01T08:00:00Z',
      url: `/api/v1/tickets/${TICKET_ID}/images/image-removed/content`,
      width: 640,
    },
  ]
}
