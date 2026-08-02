import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { useFormFieldId } from '@/shared/forms/form-field-scope-context'
import { TextField, type TextFieldProps } from '@/shared/ui/TextField'

export interface ControlledTextFieldProps<
  TFieldValues extends FieldValues,
> extends Omit<
  TextFieldProps,
  | 'defaultValue'
  | 'errorMessage'
  | 'isInvalid'
  | 'inputRef'
  | 'name'
  | 'onBlur'
  | 'onChange'
  | 'value'
> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
}

export function ControlledTextField<TFieldValues extends FieldValues>({
  control,
  id,
  name,
  ...props
}: ControlledTextFieldProps<TFieldValues>) {
  const fieldId = useFormFieldId(name, id)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...props}
          errorMessage={fieldState.error?.message}
          id={fieldId}
          inputRef={field.ref}
          isInvalid={fieldState.invalid}
          name={field.name}
          onBlur={field.onBlur}
          onChange={field.onChange}
          value={typeof field.value === 'string' ? field.value : ''}
        />
      )}
    />
  )
}
