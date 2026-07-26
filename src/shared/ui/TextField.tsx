import type { ReactNode } from 'react'
import {
  FieldError,
  Input,
  Label,
  Text,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components'

import { cn } from '@/shared/lib/cn'

export interface TextFieldProps
  extends Omit<AriaTextFieldProps, 'children' | 'className'> {
  className?: string
  description?: ReactNode
  errorMessage?: ReactNode
  inputClassName?: string
  label: ReactNode
}

export function TextField({
  className,
  description,
  errorMessage,
  inputClassName,
  isRequired,
  label,
  validationBehavior = 'aria',
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField
      {...props}
      className={cn('group grid gap-2', className)}
      isRequired={isRequired}
      validationBehavior={validationBehavior}
    >
      <Label className="flex items-baseline gap-1 text-sm font-semibold text-on-surface">
        <span>{label}</span>
        {isRequired ? (
          <span aria-hidden="true" className="text-error">
            *
          </span>
        ) : null}
      </Label>

      <Input
        className={cn(
          'min-h-11 w-full rounded-lg border border-outline bg-surface px-3 py-2.5',
          'text-base text-on-surface shadow-sm outline-none transition-colors',
          'placeholder:text-on-surface-variant',
          'hover:border-secondary',
          'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'group-data-[invalid]:border-error group-data-[invalid]:focus-visible:ring-error',
          'disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:opacity-70',
          inputClassName,
        )}
      />

      {description ? (
        <Text
          className="text-sm leading-5 text-on-surface-variant"
          slot="description"
        >
          {description}
        </Text>
      ) : null}

      <FieldError className="text-sm font-medium leading-5 text-error">
        {errorMessage}
      </FieldError>
    </AriaTextField>
  )
}
