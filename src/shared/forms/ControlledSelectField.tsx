import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { useFormFieldId } from '@/shared/forms/form-field-scope-context'
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
  const fieldId = useFormFieldId(name, id)

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
