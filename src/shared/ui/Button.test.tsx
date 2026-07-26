import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '@/shared/ui/Button'
import { renderWithProviders } from '@/test/render'

describe('Button', () => {
  it('forwards accessible presses', async () => {
    const user = userEvent.setup()
    const onPress = vi.fn()

    renderWithProviders(<Button onPress={onPress}>Speichern</Button>)

    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onPress).toHaveBeenCalledOnce()
  })

  it('cannot be pressed while disabled', async () => {
    const user = userEvent.setup()
    const onPress = vi.fn()

    renderWithProviders(
      <Button isDisabled onPress={onPress}>
        Speichern
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Speichern' })
    expect(button).toBeDisabled()

    await user.click(button)

    expect(onPress).not.toHaveBeenCalled()
  })
})
