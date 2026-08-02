import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { useFormFieldId } from '@/shared/forms/FormFieldScope'
import {
  CheckboxField,
  type CheckboxFieldProps,
} from '@/shared/ui/CheckboxField'

export interface ControlledCheckboxFieldProps<
  TFieldValues extends FieldValues,
> extends Omit<
  CheckboxFieldProps,
  | 'defaultSelected'
  | 'errorMessage'
  | 'isInvalid'
  | 'isSelected'
  | 'name'
  | 'onBlur'
  | 'onChange'
> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
}

export function ControlledCheckboxField<TFieldValues extends FieldValues>({
  control,
  id,
  name,
  ...props
}: ControlledCheckboxFieldProps<TFieldValues>) {
  const fieldId = useFormFieldId(name, id)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <CheckboxField
          {...props}
          errorMessage={fieldState.error?.message}
          id={fieldId}
          isInvalid={fieldState.invalid}
          isSelected={Boolean(field.value)}
          name={field.name}
          onBlur={field.onBlur}
          onChange={field.onChange}
        />
      )}
    />
  )
}
