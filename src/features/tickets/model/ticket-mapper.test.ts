import { describe, expect, it } from 'vitest'

import type {
  PaginatedResponseTicketInternalResponse,
  TicketInternalDetailResponse,
} from '@/api/generated/models'
import {
  mapTicketInternalDetailResponse,
  mapTicketPage,
} from '@/features/tickets/model/ticket-mapper'

const TICKET_ID = '00000000-0000-4000-8000-000000000100'

function ticketResponse(): TicketInternalDetailResponse {
  return {
    address: {
      city: 'Leipzig',
      house_number: '18',
      id: 'address-1',
      latitude: 51.34,
      longitude: 12.37,
      street: 'Parkstraße',
      zip_code: '04109',
    },
    allowed_actions: ['FORWARD', 'COMPLETE'],
    category: 'INFRASTRUCTURE',
    created_at: '2026-08-01T08:00:00Z',
    creator: {
      display_name: 'Clara Bürgerin',
      id: 'citizen-1',
    },
    creator_user_id: 'citizen-1',
    current_assignee: {
      display_name: 'Olaf Ordnung',
      id: 'officer-1',
    },
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
    office: {
      id: 'office-1',
      name: 'Tiefbauamt',
    },
    office_id: 'office-1',
    primary_officer: {
      display_name: 'Paula Primär',
      id: 'officer-2',
    },
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

describe('ticket mapper', () => {
  it('maps the enriched backend projection into the feature read model', () => {
    expect(mapTicketInternalDetailResponse(ticketResponse())).toEqual({
      address: {
        city: 'Leipzig',
        houseNumber: '18',
        latitude: 51.34,
        longitude: 12.37,
        street: 'Parkstraße',
        zipCode: '04109',
      },
      allowedActions: ['FORWARD', 'COMPLETE'],
      category: 'INFRASTRUCTURE',
      createdAt: '2026-08-01T08:00:00Z',
      creator: { displayName: 'Clara Bürgerin', id: 'citizen-1' },
      currentAssignee: { displayName: 'Olaf Ordnung', id: 'officer-1' },
      currentStatus: {
        createdAt: '2026-08-02T08:00:00Z',
        id: 'status-1',
        message: 'Die Bearbeitung wurde aufgenommen.',
        status: 'IN_PROGRESS',
      },
      description: 'Ein tiefes Schlagloch befindet sich am rechten Fahrbahnrand.',
      id: TICKET_ID,
      imageUrl: null,
      office: { id: 'office-1', name: 'Tiefbauamt' },
      primaryOfficer: { displayName: 'Paula Primär', id: 'officer-2' },
      returnToUser: null,
      title: 'Schlagloch in der Parkstraße',
      updatedAt: '2026-08-02T09:30:00Z',
      version: 4,
      visibility: 'PUBLIC',
      workflowState: 'IN_PROGRESS',
    })
  })

  it('maps list pages without carrying detail-only workflow actions', () => {
    const listItem = ticketResponse()
    const response: PaginatedResponseTicketInternalResponse = {
      data: [listItem],
      page: 2,
      pages: 3,
      size: 20,
      total: 41,
    }

    const page = mapTicketPage(response)

    expect(page.page).toBe(2)
    expect(page.totalItems).toBe(41)
    expect(page.items[0]?.allowedActions).toEqual([])
  })
})
