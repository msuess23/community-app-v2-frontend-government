import { describe, expect, it, vi } from 'vitest'

import {
  createTicketActiveFilters,
  createTicketOfficeFilterOptions,
  getTicketOfficeFilterDescription,
} from '@/features/tickets/model/ticket-directory-filters'

const offices = [
  { id: 'office-1', isActive: true, name: 'Tiefbauamt' },
  { id: 'office-2', isActive: false, name: 'Altbehörde' },
] as const

function createCallbacks() {
  return {
    onSetCategory: vi.fn(),
    onSetCreatedFrom: vi.fn(),
    onSetCreatedTo: vi.fn(),
    onSetLifecycle: vi.fn(),
    onSetOffice: vi.fn(),
    onSetSearch: vi.fn(),
    onSetStatus: vi.fn(),
    onSetUpdatedFrom: vi.fn(),
    onSetUpdatedTo: vi.fn(),
    onSetWorkflowState: vi.fn(),
  }
}

describe('ticket directory filter presentation', () => {
  it('creates localized removable filters without exposing raw office identifiers', () => {
    const callbacks = createCallbacks()
    const filters = createTicketActiveFilters({
      ...callbacks,
      category: 'INFRASTRUCTURE',
      createdFrom: '2026-08-01',
      createdTo: '',
      lifecycle: 'all',
      office: 'office-1',
      offices,
      search: 'Schlagloch',
      status: 'IN_PROGRESS',
      updatedFrom: '',
      updatedTo: '',
      workflowState: 'WAITING_FOR_DECISION',
    })

    expect(filters.map((filter) => filter.label)).toEqual([
      'Suche: Schlagloch',
      'Bestand: Aktive und abgeschlossene Tickets',
      'Workflow: Wartet auf Entscheidung',
      'Status: In Bearbeitung',
      'Kategorie: Infrastruktur',
      'Behörde: Tiefbauamt',
      'Erstellt ab: 2026-08-01',
    ])
    expect(filters.map((filter) => filter.label).join(' ')).not.toContain(
      'office-1',
    )

    filters.find((filter) => filter.key === 'office')?.onRemove()
    expect(callbacks.onSetOffice).toHaveBeenCalledWith('')
  })

  it('keeps a selected office stable while its reference is still loading', () => {
    expect(createTicketOfficeFilterOptions(offices, 'office-missing')).toEqual([
      { label: 'Tiefbauamt', value: 'office-1' },
      { label: 'Altbehörde (deaktiviert)', value: 'office-2' },
      {
        label: 'Ausgewählte Behörde wird geladen',
        value: 'office-missing',
      },
    ])
  })

  it('isolates office-directory loading failures from the remaining filters', () => {
    expect(getTicketOfficeFilterDescription(true, false)).toContain('geladen')
    expect(getTicketOfficeFilterDescription(false, true)).toContain(
      'übrigen Filter bleiben verfügbar',
    )
    expect(getTicketOfficeFilterDescription(false, false)).toBeUndefined()
  })
})
