import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { useFormFieldId } from '@/shared/forms/FormFieldScope'
import {
  FileUploadField,
  type FileUploadFieldProps,
} from '@/shared/ui/FileUploadField'

export interface ControlledFileUploadFieldProps<
  TFieldValues extends FieldValues,
> extends Omit<
  FileUploadFieldProps,
  | 'errorMessage'
  | 'files'
  | 'inputRef'
  | 'isInvalid'
  | 'name'
  | 'onBlur'
  | 'onFilesChange'
> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
}

/** Connects a file picker to a React Hook Form field containing a File array. */
export function ControlledFileUploadField<TFieldValues extends FieldValues>({
  control,
  id,
  name,
  ...props
}: ControlledFileUploadFieldProps<TFieldValues>) {
  const fieldId = useFormFieldId(name, id)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FileUploadField
          {...props}
          errorMessage={fieldState.error?.message}
          files={Array.isArray(field.value) ? field.value : []}
          id={fieldId}
          inputRef={field.ref}
          isInvalid={fieldState.invalid}
          name={field.name}
          onBlur={field.onBlur}
          onFilesChange={field.onChange}
        />
      )}
    />
  )
}
