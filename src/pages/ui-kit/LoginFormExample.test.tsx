import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { LoginFormExample } from '@/pages/ui-kit/LoginFormExample'
import { renderWithProviders } from '@/test/render'

describe('LoginFormExample', () => {
  it('shows validation errors and focuses the first invalid field', async () => {
    const user = userEvent.setup()

    renderWithProviders(<LoginFormExample />)

    await user.click(
      screen.getByRole('button', { name: 'Beispiel validieren' }),
    )

    const errorSummary = screen.getByRole('alert')

    expect(errorSummary).toBeInTheDocument()
    expect(errorSummary).toHaveTextContent(
      'Bitte gib deine E-Mail-Adresse ein.',
    )
    expect(screen.getByLabelText('E-Mail-Adresse')).toHaveFocus()
  })

  it('submits valid values from controlled fields', async () => {
    const user = userEvent.setup()

    renderWithProviders(<LoginFormExample />)

    await user.type(screen.getByLabelText('E-Mail-Adresse'), 'admin@test.com')
    await user.type(screen.getByLabelText('Passwort'), 'sicheres-passwort')
    await user.click(
      screen.getByRole('checkbox', { name: 'Angemeldet bleiben' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Beispiel validieren' }),
    )

    expect(screen.getByRole('status')).toHaveTextContent('admin@test.com')
  })
})
