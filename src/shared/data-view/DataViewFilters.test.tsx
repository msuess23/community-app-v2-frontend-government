import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  ActiveDataViewFilters,
  DataViewFilterDateField,
  DataViewFilterPanel,
  DataViewFilterSelect,
} from '@/shared/data-view/DataViewFilters'
import { DataViewSortControl } from '@/shared/data-view/DataViewSortControl'
import { renderWithProviders } from '@/test/render'

describe('data view filters', () => {
  it('opens the compact filter panel and returns focus after Escape', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <DataViewFilterPanel activeFilterCount={1}>
        <DataViewFilterSelect
          label="Status"
          onChange={vi.fn()}
          options={[{ label: 'Offen', value: 'OPEN' }]}
          value="OPEN"
        />
      </DataViewFilterPanel>,
    )

    const trigger = screen.getByRole('button', {
      name: 'Filter: 1 aktiver Filter',
    })
    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await user.tab()
    await user.keyboard('{Escape}')

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('keeps desktop filter controls compact in one wrapping row', () => {
    renderWithProviders(
      <DataViewFilterPanel>
        <DataViewFilterSelect
          label="Rolle"
          onChange={vi.fn()}
          options={[]}
          value=""
        />
        <DataViewSortControl
          onChange={vi.fn()}
          options={[{ field: 'name', label: 'Name' }]}
          value={null}
        />
      </DataViewFilterPanel>,
    )

    const select = screen.getByLabelText('Rolle')
    expect(select.parentElement).toHaveClass('lg:w-56', 'xl:w-64')
    expect(select.parentElement?.parentElement).toHaveClass(
      'lg:flex',
      'lg:flex-wrap',
    )
    expect(screen.getByLabelText('Sortierung').parentElement).toHaveClass(
      'lg:w-56',
      'xl:w-64',
    )
  })

  it('removes an active filter through a named action', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()

    renderWithProviders(
      <ActiveDataViewFilters
        filters={[{ key: 'status', label: 'Status: Offen', onRemove }]}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Filter „Status: Offen“ entfernen',
      }),
    )

    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('describes and disables a filter while remote options are unavailable', () => {
    renderWithProviders(
      <DataViewFilterSelect
        description="Behörden werden geladen."
        isDisabled
        label="Behörde"
        onChange={vi.fn()}
        options={[]}
        value=""
      />,
    )

    const select = screen.getByLabelText('Behörde')
    expect(select).toBeDisabled()
    expect(select).toHaveAccessibleDescription('Behörden werden geladen.')
  })

  it('uses the established native date input with German locale metadata', () => {
    const onChange = vi.fn()

    renderWithProviders(
      <DataViewFilterDateField
        description="Der vollständige Kalendertag wird berücksichtigt."
        label="Von"
        onChange={onChange}
        value=""
      />,
    )

    const input = screen.getByLabelText('Von')
    fireEvent.change(input, { target: { value: '2026-08-03' } })

    expect(input).toHaveAttribute('lang', 'de-DE')
    expect(input).toHaveAttribute('type', 'date')
    expect(input).toHaveAccessibleDescription(
      'Der vollständige Kalendertag wird berücksichtigt.',
    )
    expect(onChange).toHaveBeenLastCalledWith('2026-08-03')
  })
})
