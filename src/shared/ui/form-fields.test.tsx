import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { FileUploadField } from '@/shared/ui/FileUploadField'
import { RadioGroupField } from '@/shared/ui/RadioGroupField'
import { SelectField } from '@/shared/ui/SelectField'
import { TextAreaField } from '@/shared/ui/TextAreaField'
import { renderWithProviders } from '@/test/render'

describe('shared form fields', () => {
  it('connects descriptions and errors to a textarea', () => {
    renderWithProviders(
      <TextAreaField
        description="Mindestens zehn Zeichen."
        errorMessage="Die Beschreibung ist zu kurz."
        isInvalid
        label="Beschreibung"
      />,
    )

    const field = screen.getByRole('textbox', { name: 'Beschreibung' })
    expect(field).toHaveAccessibleDescription(
      'Mindestens zehn Zeichen. Die Beschreibung ist zu kurz.',
    )
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Die Beschreibung ist zu kurz.')).toBeVisible()
  })

  it('uses a native select with an accessible validation state', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <SelectField
        errorMessage="Bitte auswählen."
        isInvalid
        label="Bereich"
        onChange={() => undefined}
        options={[{ label: 'Verkehr', value: 'traffic' }]}
        placeholder="Bereich auswählen"
      />,
    )

    const select = screen.getByRole('combobox', { name: 'Bereich' })
    await user.selectOptions(select, 'traffic')

    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Bitte auswählen.')).toBeVisible()
  })

  it('exposes all radio choices and updates the selected value', async () => {
    const user = userEvent.setup()

    function Example() {
      const [value, setValue] = useState('normal')
      return (
        <RadioGroupField
          label="Priorität"
          onChange={setValue}
          options={[
            { label: 'Normal', value: 'normal' },
            { label: 'Dringend', value: 'urgent' },
          ]}
          value={value}
        />
      )
    }

    renderWithProviders(<Example />)
    await user.click(screen.getByRole('radio', { name: 'Dringend' }))

    expect(screen.getByRole('radio', { name: 'Dringend' })).toBeChecked()
  })

  it('lists selected files and allows clearing the complete selection', async () => {
    const user = userEvent.setup()

    function Example() {
      const [files, setFiles] = useState<File[]>([])
      return (
        <FileUploadField
          files={files}
          label="Anlagen"
          multiple
          onFilesChange={setFiles}
        />
      )
    }

    renderWithProviders(<Example />)
    const input = screen.getByLabelText('Anlagen')
    await user.upload(
      input,
      new File(['inhalt'], 'nachweis.pdf', { type: 'application/pdf' }),
    )

    expect(screen.getByText('nachweis.pdf')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Auswahl entfernen' }))
    expect(screen.queryByText('nachweis.pdf')).not.toBeInTheDocument()
  })
})
