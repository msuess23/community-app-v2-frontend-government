import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DataViewPagination } from '@/shared/data-view/DataViewPagination'
import {
  getPageCount,
  getVisiblePages,
} from '@/shared/data-view/pagination'
import { renderWithProviders } from '@/test/render'

describe('DataViewPagination', () => {
  it('describes the current result range and changes pages', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()

    renderWithProviders(
      <DataViewPagination
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
        page={2}
        pageSize={20}
        total={53}
      />,
    )

    expect(screen.getByText('21–40 von 53 Ergebnissen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Seite 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await user.click(screen.getByRole('button', { name: 'Nächste Seite' }))

    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('changes page size and reports an empty result set', async () => {
    const user = userEvent.setup()
    const onPageSizeChange = vi.fn()

    renderWithProviders(
      <DataViewPagination
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
        page={1}
        pageSize={20}
        total={0}
      />,
    )

    expect(screen.getByText('Keine Ergebnisse')).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Einträge pro Seite' }),
      '50',
    )

    expect(onPageSizeChange).toHaveBeenCalledWith(50)
  })
})

describe('pagination calculations', () => {
  it('creates stable page counts and compact windows', () => {
    expect(getPageCount(101, 20)).toBe(6)
    expect(getPageCount(0, 20)).toBe(1)
    expect(getVisiblePages(5, 10)).toEqual([
      1,
      'ellipsis-start',
      4,
      5,
      6,
      'ellipsis-end',
      10,
    ])
  })
})
