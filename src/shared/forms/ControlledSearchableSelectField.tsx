import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { useFormFieldId } from '@/shared/forms/form-field-scope-context'
import {
  SearchableSelectField,
  type SearchableSelectFieldProps,
} from '@/shared/ui/SearchableSelectField'

export interface ControlledSearchableSelectFieldProps<
  TFieldValues extends FieldValues,
> extends Omit<
  SearchableSelectFieldProps,
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

/** Connects the searchable native-select pattern to a React Hook Form string value. */
export function ControlledSearchableSelectField<
  TFieldValues extends FieldValues,
>({
  control,
  id,
  name,
  ...props
}: ControlledSearchableSelectFieldProps<TFieldValues>) {
  const fieldId = useFormFieldId(name, id)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <SearchableSelectField
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
