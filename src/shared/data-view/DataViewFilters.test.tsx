import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  ActiveDataViewFilters,
  DataViewFilterPanel,
  DataViewFilterSelect,
} from '@/shared/data-view/DataViewFilters'
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

})
