import { ChevronDown } from 'lucide-react'
import {
  useId,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
} from 'react'

import { cn } from '@/shared/lib/cn'

export type SelectFieldOption = Readonly<{
  description?: string
  isDisabled?: boolean
  label: string
  value: string
}>

export interface SelectFieldProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children' | 'className'
> {
  className?: string
  description?: ReactNode
  errorMessage?: ReactNode
  isInvalid?: boolean
  label: ReactNode
  options: readonly SelectFieldOption[]
  placeholder?: string
  selectClassName?: string
  selectRef?: Ref<HTMLSelectElement>
}

/** Renders a native select so platform and assistive-technology behavior remains predictable. */
export function SelectField({
  'aria-describedby': ariaDescribedBy,
  className,
  description,
  errorMessage,
  id,
  isInvalid = false,
  label,
  options,
  placeholder,
  required,
  selectClassName,
  selectRef,
  ...props
}: SelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = description ? `${fieldId}-description` : undefined
  const errorId = isInvalid && errorMessage ? `${fieldId}-error` : undefined
  const describedBy = [ariaDescribedBy, descriptionId, errorId]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cn('grid gap-2', className)}>
      <label
        className="text-on-surface flex items-baseline gap-1 text-sm font-semibold"
        htmlFor={fieldId}
      >
        <span>{label}</span>
        {required ? (
          <span aria-hidden="true" className="text-error">
            *
          </span>
        ) : null}
      </label>

      <div className="relative">
        <select
          {...props}
          aria-describedby={describedBy || undefined}
          aria-errormessage={errorId}
          aria-invalid={isInvalid || undefined}
          className={cn(
            'border-outline bg-surface min-h-11 w-full appearance-none rounded-lg border py-2.5 pr-11 pl-3',
            'text-on-surface text-base shadow-sm transition-colors outline-none',
            'hover:border-secondary',
            'focus-visible:border-primary focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
            isInvalid &&
              'border-error focus-visible:border-error focus-visible:ring-error',
            'disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-70',
            selectClassName,
          )}
          id={fieldId}
          ref={selectRef}
          required={required}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option
              disabled={option.isDisabled}
              key={option.value}
              value={option.value}
            >
              {option.label}
              {option.description ? ` – ${option.description}` : ''}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="text-on-surface-variant pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
          size={20}
        />
      </div>

      {description ? (
        <p
          className="text-on-surface-variant text-sm leading-5"
          id={descriptionId}
        >
          {description}
        </p>
      ) : null}

      {isInvalid && errorMessage ? (
        <p className="text-error text-sm leading-5 font-medium" id={errorId}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
