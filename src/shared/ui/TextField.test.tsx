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

  it('forwards native date-time attributes to the input control', () => {
    renderWithProviders(
      <TextField
        inputLang="de-DE"
        label="Beginn"
        max="2099-08-12T12:00"
        min="2026-08-06T12:00"
        step={60}
        type="datetime-local"
      />,
    )

    const input = screen.getByLabelText('Beginn')
    expect(input).toHaveAttribute('lang', 'de-DE')
    expect(input).toHaveAttribute('max', '2099-08-12T12:00')
    expect(input).toHaveAttribute('min', '2026-08-06T12:00')
    expect(input).toHaveAttribute('step', '60')
    expect(input).toHaveAttribute('type', 'datetime-local')
  })

  it('reports value changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    renderWithProviders(<TextField label="Vorname" onChange={onChange} />)

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
