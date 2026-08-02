import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { useFormFieldId } from '@/shared/forms/FormFieldScope'
import {
  TextAreaField,
  type TextAreaFieldProps,
} from '@/shared/ui/TextAreaField'

export interface ControlledTextAreaFieldProps<
  TFieldValues extends FieldValues,
> extends Omit<
  TextAreaFieldProps,
  | 'defaultValue'
  | 'errorMessage'
  | 'isInvalid'
  | 'name'
  | 'onBlur'
  | 'onChange'
  | 'textAreaRef'
  | 'value'
> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
}

/** Connects the shared multiline field to a React Hook Form field. */
export function ControlledTextAreaField<TFieldValues extends FieldValues>({
  control,
  id,
  name,
  ...props
}: ControlledTextAreaFieldProps<TFieldValues>) {
  const fieldId = useFormFieldId(name, id)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextAreaField
          {...props}
          errorMessage={fieldState.error?.message}
          id={fieldId}
          isInvalid={fieldState.invalid}
          name={field.name}
          onBlur={field.onBlur}
          onChange={field.onChange}
          textAreaRef={field.ref}
          value={typeof field.value === 'string' ? field.value : ''}
        />
      )}
    />
  )
}
