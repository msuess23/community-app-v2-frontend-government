import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { FormErrorSummary } from './FormErrorSummary'

describe('FormErrorSummary', () => {
  it('links field errors to the affected controls', () => {
    renderWithProviders(
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

  it('renders nothing without errors', () => {
    const { container } = renderWithProviders(
      <FormErrorSummary errors={[]} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
