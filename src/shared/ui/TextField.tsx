import type { ReactNode, Ref } from 'react'
import {
  FieldError,
  Input,
  Label,
  Text,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components'

import { cn } from '@/shared/lib/cn'

export interface TextFieldProps extends Omit<
  AriaTextFieldProps,
  'children' | 'className'
> {
  className?: string
  description?: ReactNode
  errorMessage?: ReactNode
  inputClassName?: string
  inputLang?: string
  inputRef?: Ref<HTMLInputElement>
  label: ReactNode
  placeholder?: string
  step?: number | string
}

export function TextField({
  className,
  description,
  errorMessage,
  inputClassName,
  inputLang,
  inputRef,
  isRequired,
  label,
  placeholder,
  step,
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
      <Label className="text-on-surface flex items-baseline gap-1 text-sm font-semibold">
        <span>{label}</span>
        {isRequired ? (
          <span aria-hidden="true" className="text-error">
            *
          </span>
        ) : null}
      </Label>

      <Input
        lang={inputLang}
        ref={inputRef}
        placeholder={placeholder}
        step={step}
        className={cn(
          'border-outline bg-surface min-h-11 w-full rounded-lg border px-3 py-2.5',
          'text-on-surface text-base shadow-sm transition-colors outline-none',
          'placeholder:text-on-surface-variant',
          'hover:border-secondary',
          'focus-visible:border-primary focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
          'group-data-[invalid]:border-error group-data-[invalid]:focus-visible:ring-error',
          'disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-70',
          inputClassName,
        )}
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
