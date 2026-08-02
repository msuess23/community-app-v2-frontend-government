import type { FieldErrors } from 'react-hook-form'
import { describe, expect, it } from 'vitest'

import { getFormErrorSummary } from '@/shared/forms/form-errors'

interface ExampleValues {
  email: string
  profile: {
    firstName: string
  }
}

describe('getFormErrorSummary', () => {
  it('maps flat and nested field errors to linkable summary items', () => {
    const errors: FieldErrors<ExampleValues> = {
      email: {
        message: 'Die E-Mail-Adresse ist ungültig.',
        type: 'validation',
      },
      profile: {
        firstName: {
          message: 'Der Vorname fehlt.',
          type: 'validation',
        },
      },
    }

    expect(getFormErrorSummary(errors)).toEqual([
      {
        fieldName: 'email',
        message: 'Die E-Mail-Adresse ist ungültig.',
      },
      {
        fieldName: 'profile.firstName',
        message: 'Der Vorname fehlt.',
      },
    ])
  })
})
