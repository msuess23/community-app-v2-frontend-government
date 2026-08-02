import { act, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataViewSearchField } from '@/shared/data-view/DataViewSearchField'
import { renderWithProviders } from '@/test/render'

afterEach(() => {
  vi.useRealTimers()
})

describe('DataViewSearchField', () => {
  it('commits a normalized search after the debounce delay', () => {
    vi.useFakeTimers()
    const onSearch = vi.fn()

    renderWithProviders(
      <DataViewSearchField debounceMs={300} onSearch={onSearch} value="" />,
    )

    fireEvent.change(screen.getByRole('searchbox', { name: 'Suche' }), {
      target: { value: '  Laterne  ' },
    })

    expect(onSearch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onSearch).toHaveBeenCalledWith('Laterne')
  })

  it('submits immediately and clears the field with restored focus', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    renderWithProviders(
      <DataViewSearchField onSearch={onSearch} value="Ampel" />,
    )

    const searchbox = screen.getByRole('searchbox', { name: 'Suche' })
    await user.clear(searchbox)
    await user.type(searchbox, 'Schild')
    await user.click(screen.getByRole('button', { name: 'Suchen' }))

    expect(onSearch).toHaveBeenCalledWith('Schild')

    await user.click(
      screen.getByRole('button', { name: 'Sucheingabe löschen' }),
    )

    expect(onSearch).toHaveBeenLastCalledWith('')
    expect(searchbox).toHaveFocus()
  })

  it('adopts a search value restored from external URL navigation', () => {
    const onSearch = vi.fn()
    const { rerender } = renderWithProviders(
      <DataViewSearchField onSearch={onSearch} value="Alt" />,
    )

    rerender(<DataViewSearchField onSearch={onSearch} value="Neu" />)

    expect(screen.getByRole('searchbox', { name: 'Suche' })).toHaveValue('Neu')
    expect(onSearch).not.toHaveBeenCalled()
  })
})
