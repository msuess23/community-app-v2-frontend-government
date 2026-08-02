import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { FormErrorSummary } from './FormErrorSummary'

describe('FormErrorSummary', () => {
  it('links field errors to the affected controls', () => {
    render(
      <FormErrorSummary
        errors={[
          {
            fieldId: 'email',
            message: 'Die E-Mail-Adresse ist ungültig.',
          },
        ]}
      />,
    )

    expect(
      screen.getByRole('link', { name: 'Die E-Mail-Adresse ist ungültig.' }),
    ).toHaveAttribute('href', '#email')
  })

  it('moves focus to a linked field without changing the URL hash', async () => {
    const user = userEvent.setup()
    render(
      <>
        <input aria-label="E-Mail-Adresse" id="email" />
        <FormErrorSummary
          errors={[
            {
              fieldId: 'email',
              message: 'Die E-Mail-Adresse ist ungültig.',
            },
          ]}
        />
      </>,
    )

    await user.click(
      screen.getByRole('link', { name: 'Die E-Mail-Adresse ist ungültig.' }),
    )

    expect(
      screen.getByRole('textbox', { name: 'E-Mail-Adresse' }),
    ).toHaveFocus()
    expect(window.location.hash).toBe('')
  })

  it('focuses the summary when a failed submission requests it', async () => {
    render(
      <FormErrorSummary
        errors={[{ message: 'Speichern fehlgeschlagen.' }]}
        focusKey={1}
        shouldFocus
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveFocus()
    })
  })

  it('does not steal focus while existing errors are corrected', async () => {
    const { rerender } = render(
      <>
        <input aria-label="E-Mail-Adresse" id="email" />
        <FormErrorSummary
          errors={[
            { fieldId: 'email', message: 'Die E-Mail-Adresse ist ungültig.' },
            { message: 'Eine weitere Angabe fehlt.' },
          ]}
          focusKey={1}
          shouldFocus
        />
      </>,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveFocus()
    })
    screen.getByRole('textbox', { name: 'E-Mail-Adresse' }).focus()

    rerender(
      <>
        <input aria-label="E-Mail-Adresse" id="email" />
        <FormErrorSummary
          errors={[
            { fieldId: 'email', message: 'Die E-Mail-Adresse ist ungültig.' },
          ]}
          focusKey={1}
          shouldFocus
        />
      </>,
    )

    expect(
      screen.getByRole('textbox', { name: 'E-Mail-Adresse' }),
    ).toHaveFocus()
  })

  it('renders nothing without errors', () => {
    const { container } = render(<FormErrorSummary errors={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
