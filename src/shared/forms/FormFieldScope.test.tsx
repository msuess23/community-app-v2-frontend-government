import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  FormFieldScope,
  useFormFieldId,
} from '@/shared/forms/FormFieldScope'
import { FormErrorSummary } from '@/shared/ui/FormErrorSummary'
import { TextField } from '@/shared/ui/TextField'
import { renderWithProviders } from '@/test/render'

function ScopedExample({ testId }: { testId: string }) {
  return (
    <FormFieldScope>
      <section data-testid={testId}>
        <FormErrorSummary
          errors={[{ fieldName: 'description', message: 'Bitte ausfüllen.' }]}
        />
        <ScopedTextField />
      </section>
    </FormFieldScope>
  )
}

function ScopedTextField() {
  const fieldId = useFormFieldId('description')
  return <TextField id={fieldId} label="Beschreibung" />
}

describe('FormFieldScope', () => {
  it('creates distinct field IDs and matching error links for parallel forms', () => {
    const { getByTestId } = renderWithProviders(
      <>
        <ScopedExample testId="first-form" />
        <ScopedExample testId="second-form" />
      </>,
    )

    const first = within(getByTestId('first-form'))
    const second = within(getByTestId('second-form'))
    const firstField = first.getByRole('textbox', { name: 'Beschreibung' })
    const secondField = second.getByRole('textbox', { name: 'Beschreibung' })

    expect(firstField.id).not.toBe(secondField.id)
    expect(first.getByRole('link')).toHaveAttribute('href', `#${firstField.id}`)
    expect(second.getByRole('link')).toHaveAttribute(
      'href',
      `#${secondField.id}`,
    )
  })
})
