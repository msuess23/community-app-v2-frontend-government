import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { TextField } from './TextField'

describe('TextField', () => {
  it('connects its visible label and description to the input', () => {
    renderWithProviders(
      <TextField
        description="Wir verwenden die Adresse nur zur Anmeldung."
        label="E-Mail-Adresse"
        type="email"
      />,
    )

    const input = screen.getByRole('textbox', { name: 'E-Mail-Adresse' })

    expect(input).toHaveAccessibleDescription(
      'Wir verwenden die Adresse nur zur Anmeldung.',
    )
  })

  it('reports value changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    renderWithProviders(
      <TextField label="Vorname" onChange={onChange} />,
    )

    await user.type(screen.getByRole('textbox', { name: 'Vorname' }), 'Mia')

    expect(onChange).toHaveBeenLastCalledWith('Mia')
  })

  it('shows an accessible error message for invalid input', () => {
    renderWithProviders(
      <TextField
        errorMessage="Bitte gib eine gültige E-Mail-Adresse ein."
        isInvalid
        label="E-Mail-Adresse"
        type="email"
      />,
    )

    expect(
      screen.getByText('Bitte gib eine gültige E-Mail-Adresse ein.'),
    ).toBeVisible()
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })
})
