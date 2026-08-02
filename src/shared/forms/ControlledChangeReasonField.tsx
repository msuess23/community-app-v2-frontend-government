import type { FieldValues } from 'react-hook-form'

import {
  ControlledTextAreaField,
  type ControlledTextAreaFieldProps,
} from '@/shared/forms/ControlledTextAreaField'

export type ControlledChangeReasonFieldProps<TFieldValues extends FieldValues> =
  Omit<
    ControlledTextAreaFieldProps<TFieldValues>,
    'description' | 'isRequired' | 'label' | 'maxLength' | 'rows'
  > &
    Partial<
      Pick<ControlledTextAreaFieldProps<TFieldValues>, 'description' | 'label'>
    >

/** Collects the mandatory audit explanation used by administrative mutations. */
export function ControlledChangeReasonField<TFieldValues extends FieldValues>({
  description = 'Die Begründung wird dauerhaft in der Änderungshistorie gespeichert.',
  label = 'Änderungsgrund',
  ...props
}: ControlledChangeReasonFieldProps<TFieldValues>) {
  return (
    <ControlledTextAreaField
      {...props}
      description={description}
      isRequired
      label={label}
      maxLength={500}
      rows={4}
    />
  )
}
