import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  ResponsiveDataView,
  type DataViewColumn,
} from '@/shared/data-view/ResponsiveDataView'
import { DataViewStatusBadge } from '@/shared/data-view/DataViewStatusBadge'
import { Button } from '@/shared/ui/Button'
import { renderWithProviders } from '@/test/render'

type Item = Readonly<{
  id: string
  office: string
  status: string
  title: string
}>

const items: readonly Item[] = [
  {
    id: '1',
    office: 'Tiefbauamt',
    status: 'OPEN',
    title: 'Defekte Laterne',
  },
]

describe('ResponsiveDataView', () => {
  it('renders equivalent semantic table and compact card content', () => {
    renderWithProviders(
      <ResponsiveDataView
        caption="Bürgeranliegen"
        columns={createColumns()}
        getItemLabel={(item) => item.title}
        getRowKey={(item) => item.id}
        items={items}
      />,
    )

    const table = screen.getByRole('table', { name: 'Bürgeranliegen' })
    expect(within(table).getByRole('rowheader')).toHaveTextContent(
      'Defekte Laterne',
    )
    expect(within(table).getByText('Tiefbauamt')).toBeInTheDocument()

    const compactList = screen.getByRole('list', { name: 'Bürgeranliegen' })
    const article = within(compactList).getByRole('article', {
      name: 'Defekte Laterne',
    })
    expect(article).toHaveTextContent('Status')
    expect(article).toHaveTextContent('Offen')
    expect(article).toHaveTextContent('Tiefbauamt')
    expect(
      within(article).getByRole('group', {
        name: 'Aktionen für Defekte Laterne',
      }),
    ).toBeInTheDocument()
  })

  it('announces and requests the next table sort direction', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()
    const columns = createColumns(onSort)

    renderWithProviders(
      <ResponsiveDataView
        caption="Bürgeranliegen"
        columns={columns}
        getItemLabel={(item) => item.title}
        getRowKey={(item) => item.id}
        items={items}
      />,
    )

    const table = screen.getByRole('table', { name: 'Bürgeranliegen' })
    const sortableHeader = within(table).getByRole('columnheader', {
      name: /Anliegen/,
    })

    expect(sortableHeader).toHaveAttribute('aria-sort', 'ascending')

    await user.click(
      within(sortableHeader).getByRole('button', {
        name: 'Nach Anliegen absteigend sortieren',
      }),
    )

    expect(onSort).toHaveBeenCalledWith('desc')
  })
})

function createColumns(
  onSort: (direction: 'asc' | 'desc') => void = vi.fn(),
): readonly DataViewColumn<Item>[] {
  return [
    {
      header: 'Anliegen',
      id: 'title',
      isRowHeader: true,
      render: (item) => item.title,
      sort: {
        direction: 'asc',
        onChange: onSort,
        sortLabel: 'Anliegen',
      },
    },
    {
      header: 'Status',
      id: 'status',
      render: () => (
        <DataViewStatusBadge tone="info">Offen</DataViewStatusBadge>
      ),
    },
    {
      header: 'Behörde',
      id: 'office',
      render: (item) => item.office,
    },
    {
      header: 'Aktionen',
      id: 'actions',
      isAction: true,
      render: (item) => (
        <Button aria-label={`${item.title} öffnen`}>Öffnen</Button>
      ),
    },
  ]
}
