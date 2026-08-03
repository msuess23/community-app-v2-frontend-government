import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { SearchableSelectField } from '@/shared/ui/SearchableSelectField'

describe('SearchableSelectField', () => {
  it('filters long option lists while preserving the selected value', async () => {
    const user = userEvent.setup()

    render(
      <SearchableSelectField
        label="Behörde"
        onChange={() => undefined}
        options={[
          { label: 'Bürgeramt', value: 'office-1' },
          { label: 'Ordnungsamt', value: 'office-2' },
          { label: 'Standesamt', value: 'office-3' },
        ]}
        searchLabel="Behörden durchsuchen"
        value="office-2"
      />,
    )

    await user.type(
      screen.getByRole('searchbox', { name: 'Behörden durchsuchen' }),
      'Standes',
    )

    const select = screen.getByRole('combobox', { name: 'Behörde' })
    expect(select).toHaveValue('office-2')
    expect(screen.getByRole('option', { name: 'Ordnungsamt' })).toBeVisible()
    expect(screen.getByRole('option', { name: 'Standesamt' })).toBeVisible()
    expect(
      screen.queryByRole('option', { name: 'Bürgeramt' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the form control available when a search has no matches', async () => {
    const user = userEvent.setup()

    render(
      <SearchableSelectField
        label="Behörde"
        options={[{ label: 'Ordnungsamt', value: 'office-1' }]}
        searchLabel="Behörden durchsuchen"
      />,
    )

    await user.type(
      screen.getByRole('searchbox', { name: 'Behörden durchsuchen' }),
      'Feuerwehr',
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Keine passenden Einträge gefunden.',
    )
    expect(screen.getByRole('combobox', { name: 'Behörde' })).toBeVisible()
  })
})
