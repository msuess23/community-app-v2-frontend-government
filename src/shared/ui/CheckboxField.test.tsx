import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { CheckboxField } from './CheckboxField'

describe('CheckboxField', () => {
  it('reports selection changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    renderWithProviders(
      <CheckboxField label="Angemeldet bleiben" onChange={onChange} />,
    )

    await user.click(
      screen.getByRole('checkbox', { name: 'Angemeldet bleiben' }),
    )

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('connects description and error text to the checkbox', () => {
    renderWithProviders(
      <CheckboxField
        description="Nur auf privaten Geräten verwenden."
        errorMessage="Die Zustimmung ist erforderlich."
        isInvalid
        label="Zustimmen"
      />,
    )

    const checkbox = screen.getByRole('checkbox', { name: 'Zustimmen' })

    expect(checkbox).toHaveAccessibleDescription(
      'Nur auf privaten Geräten verwenden. Die Zustimmung ist erforderlich.',
    )
    expect(checkbox).toHaveAttribute('aria-invalid', 'true')
  })
})
