import type { ReactNode, Ref } from 'react'
import {
  FieldError,
  Label,
  Text,
  TextArea,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components'

import { cn } from '@/shared/lib/cn'

export interface TextAreaFieldProps extends Omit<
  AriaTextFieldProps,
  'children' | 'className'
> {
  className?: string
  description?: ReactNode
  errorMessage?: ReactNode
  label: ReactNode
  placeholder?: string
  rows?: number
  textAreaClassName?: string
  textAreaRef?: Ref<HTMLTextAreaElement>
}

/** Renders a labelled multiline field with shared validation and focus styling. */
export function TextAreaField({
  className,
  description,
  errorMessage,
  isRequired,
  label,
  placeholder,
  rows = 5,
  textAreaClassName,
  textAreaRef,
  validationBehavior = 'aria',
  ...props
}: TextAreaFieldProps) {
  return (
    <AriaTextField
      {...props}
      className={cn('group grid gap-2', className)}
      isRequired={isRequired}
      validationBehavior={validationBehavior}
    >
      <Label className="text-on-surface flex items-baseline gap-1 text-sm font-semibold">
        <span>{label}</span>
        {isRequired ? (
          <span aria-hidden="true" className="text-error">
            *
          </span>
        ) : null}
      </Label>

      <TextArea
        className={cn(
          'border-outline bg-surface min-h-32 w-full resize-y rounded-lg border px-3 py-2.5',
          'text-on-surface text-base shadow-sm transition-colors outline-none',
          'placeholder:text-on-surface-variant',
          'hover:border-secondary',
          'focus-visible:border-primary focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
          'group-data-[invalid]:border-error group-data-[invalid]:focus-visible:ring-error',
          'disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-70',
          textAreaClassName,
        )}
        placeholder={placeholder}
        ref={textAreaRef}
        rows={rows}
      />

      {description ? (
        <Text
          className="text-on-surface-variant text-sm leading-5"
          slot="description"
        >
          {description}
        </Text>
      ) : null}

      <FieldError className="text-error text-sm leading-5 font-medium">
        {errorMessage}
      </FieldError>
    </AriaTextField>
  )
}
