import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { fieldNameToId } from '@/shared/forms/field-name'
import { SelectField, type SelectFieldProps } from '@/shared/ui/SelectField'

export interface ControlledSelectFieldProps<
  TFieldValues extends FieldValues,
> extends Omit<
  SelectFieldProps,
  | 'defaultValue'
  | 'errorMessage'
  | 'isInvalid'
  | 'name'
  | 'onBlur'
  | 'onChange'
  | 'selectRef'
  | 'value'
> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
}

/** Connects a native single-select field to a React Hook Form string value. */
export function ControlledSelectField<TFieldValues extends FieldValues>({
  control,
  id,
  name,
  ...props
}: ControlledSelectFieldProps<TFieldValues>) {
  const fieldId = id ?? fieldNameToId(name)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <SelectField
          {...props}
          errorMessage={fieldState.error?.message}
          id={fieldId}
          isInvalid={fieldState.invalid}
          name={field.name}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(event.target.value)}
          selectRef={field.ref}
          value={typeof field.value === 'string' ? field.value : ''}
        />
      )}
    />
  )
}
