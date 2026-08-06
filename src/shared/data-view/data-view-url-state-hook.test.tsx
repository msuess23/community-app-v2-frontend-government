import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, useLocation } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'

import { useDataViewUrlState } from '@/shared/data-view/data-view-url-state'

const config = {
  defaultPageSize: 20,
  defaultSort: { direction: 'desc', field: 'updatedAt' },
  filters: [{ key: 'status' }],
  pageSizeOptions: [20],
  sortFields: ['title', 'updatedAt'],
} as const

describe('useDataViewUrlState', () => {
  it('preserves sequential filter and sort updates before the next render', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter(
      [{ path: '/', element: <UrlStateHarness /> }],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)

    await user.click(
      screen.getByRole('button', { name: 'Filter und sortieren' }),
    )

    expect(await screen.findByTestId('search-params')).toHaveTextContent(
      'sortBy=title&sortDirection=asc&status=ACTIVE',
    )
  })
})

function UrlStateHarness() {
  const directory = useDataViewUrlState(config)
  const location = useLocation()

  return (
    <>
      <button
        onClick={() => {
          directory.setFilter('status', 'ACTIVE')
          directory.setSort({ direction: 'asc', field: 'title' })
        }}
        type="button"
      >
        Filter und sortieren
      </button>
      <output data-testid="search-params">{location.search.slice(1)}</output>
    </>
  )
}
