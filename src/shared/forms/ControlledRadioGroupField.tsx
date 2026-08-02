import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { useFormFieldId } from '@/shared/forms/FormFieldScope'
import {
  RadioGroupField,
  type RadioGroupFieldProps,
} from '@/shared/ui/RadioGroupField'

export interface ControlledRadioGroupFieldProps<
  TFieldValues extends FieldValues,
> extends Omit<
  RadioGroupFieldProps,
  | 'errorMessage'
  | 'isInvalid'
  | 'name'
  | 'onBlur'
  | 'onChange'
  | 'value'
> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
}

/** Connects a semantic radio group to a React Hook Form string value. */
export function ControlledRadioGroupField<TFieldValues extends FieldValues>({
  control,
  id,
  name,
  ...props
}: ControlledRadioGroupFieldProps<TFieldValues>) {
  const fieldId = useFormFieldId(name, id)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <RadioGroupField
          {...props}
          errorMessage={fieldState.error?.message}
          id={fieldId}
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
