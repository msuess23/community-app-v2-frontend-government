import { Check, Minus } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import {
  Checkbox as AriaCheckbox,
  type CheckboxProps as AriaCheckboxProps,
} from 'react-aria-components'

import { cn } from '@/shared/lib/cn'

export interface CheckboxFieldProps
  extends Omit<AriaCheckboxProps, 'children' | 'className'> {
  className?: string
  description?: ReactNode
  errorMessage?: ReactNode
  label: ReactNode
}

export function CheckboxField({
  'aria-describedby': ariaDescribedBy,
  'aria-labelledby': ariaLabelledBy,
  className,
  description,
  errorMessage,
  isInvalid,
  label,
  ...props
}: CheckboxFieldProps) {
  const generatedId = useId()
  const labelId = `${generatedId}-label`
  const descriptionId = description ? `${generatedId}-description` : undefined
  const errorId = isInvalid && errorMessage ? `${generatedId}-error` : undefined
  const describedBy = [ariaDescribedBy, descriptionId, errorId]
    .filter(Boolean)
    .join(' ')

  return (
    <AriaCheckbox
      {...props}
      aria-describedby={describedBy || undefined}
      aria-errormessage={errorId}
      aria-labelledby={ariaLabelledBy ?? labelId}
      className={({ isDisabled, isFocusVisible }) =>
        cn(
          'group flex w-fit max-w-full items-start gap-3 rounded-lg',
          'text-on-surface outline-none',
          isDisabled && 'cursor-not-allowed opacity-60',
          isFocusVisible &&
            'ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low',
          className,
        )
      }
      isInvalid={isInvalid}
    >
      {({ isIndeterminate, isSelected }) => (
        <>
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
              isSelected || isIndeterminate
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline bg-surface text-transparent',
              'group-hover:border-primary',
              isInvalid && 'border-error',
            )}
          >
            {isIndeterminate ? (
              <Minus strokeWidth={3} size={14} />
            ) : (
              <Check
                className={isSelected ? 'opacity-100' : 'opacity-0'}
                strokeWidth={3}
                size={14}
              />
            )}
          </span>

          <span className="grid min-w-0 gap-1">
            <span className="text-sm font-semibold leading-5" id={labelId}>
              {label}
            </span>
            {description ? (
              <span
                className="text-sm leading-5 text-on-surface-variant"
                id={descriptionId}
              >
                {description}
              </span>
            ) : null}
            {isInvalid && errorMessage ? (
              <span
                className="text-sm font-medium leading-5 text-error"
                id={errorId}
              >
                {errorMessage}
              </span>
            ) : null}
          </span>
        </>
      )}
    </AriaCheckbox>
  )
}
