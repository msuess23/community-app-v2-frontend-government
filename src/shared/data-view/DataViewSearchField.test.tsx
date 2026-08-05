import { useState } from 'react'
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

  it('keeps focus while a debounced controlled value updates', () => {
    vi.useFakeTimers()

    function SearchHarness() {
      const [value, setValue] = useState('')

      return (
        <DataViewSearchField
          debounceMs={300}
          onSearch={setValue}
          value={value}
        />
      )
    }

    renderWithProviders(<SearchHarness />)

    const searchbox = screen.getByRole('searchbox', { name: 'Suche' })
    searchbox.focus()
    fireEvent.change(searchbox, { target: { value: 'Ordnung' } })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(searchbox).toHaveFocus()
    expect(searchbox).toHaveValue('Ordnung')

    fireEvent.change(searchbox, { target: { value: 'Ordnungsamt' } })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(searchbox).toHaveFocus()
    expect(searchbox).toHaveValue('Ordnungsamt')
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

  it('limits search input to the backend maximum length', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    renderWithProviders(
      <DataViewSearchField onSearch={onSearch} value="" />,
    )

    const searchbox = screen.getByRole('searchbox', { name: 'Suche' })
    expect(searchbox).toHaveAttribute('maxlength', '200')
    await user.type(searchbox, 'x'.repeat(205))
    await user.click(screen.getByRole('button', { name: 'Suchen' }))

    expect(searchbox).toHaveValue('x'.repeat(200))
    expect(onSearch).toHaveBeenCalledWith('x'.repeat(200))
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
