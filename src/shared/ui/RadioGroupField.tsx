import { useId, type ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export type RadioGroupFieldOption = Readonly<{
  description?: ReactNode
  isDisabled?: boolean
  label: ReactNode
  value: string
}>

export interface RadioGroupFieldProps {
  className?: string
  description?: ReactNode
  errorMessage?: ReactNode
  id?: string
  isDisabled?: boolean
  isInvalid?: boolean
  isRequired?: boolean
  label: ReactNode
  name?: string
  onBlur?: () => void
  onChange?: (value: string) => void
  options: readonly RadioGroupFieldOption[]
  orientation?: 'horizontal' | 'vertical'
  value?: string
}

/** Renders mutually exclusive choices as a semantic fieldset that exposes every option. */
export function RadioGroupField({
  className,
  description,
  errorMessage,
  id,
  isDisabled = false,
  isInvalid = false,
  isRequired = false,
  label,
  name,
  onBlur,
  onChange,
  options,
  orientation = 'vertical',
  value,
}: RadioGroupFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = description ? `${fieldId}-description` : undefined
  const errorId = isInvalid && errorMessage ? `${fieldId}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ')

  return (
    <fieldset
      id={fieldId}
      aria-describedby={describedBy || undefined}
      aria-invalid={isInvalid || undefined}
      className={cn('grid gap-3', className)}
      disabled={isDisabled}
    >
      <legend className="text-on-surface flex items-baseline gap-1 text-sm font-semibold">
        <span>{label}</span>
        {isRequired ? (
          <span aria-hidden="true" className="text-error">
            *
          </span>
        ) : null}
      </legend>

      {description ? (
        <p
          className="text-on-surface-variant -mt-1 text-sm leading-5"
          id={descriptionId}
        >
          {description}
        </p>
      ) : null}

      <div
        className={cn(
          'grid gap-3',
          orientation === 'horizontal' && 'sm:grid-cols-2 xl:grid-cols-3',
        )}
      >
        {options.map((option, index) => {
          const optionId = `${fieldId}-option-${index}`

          return (
            <label
              className={cn(
                'border-outline bg-surface flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                'hover:border-primary hover:bg-primary-container/20',
                'has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2',
                'has-[:checked]:border-primary has-[:checked]:bg-primary-container/40',
                option.isDisabled && 'cursor-not-allowed opacity-60',
                isInvalid && 'border-error',
              )}
              htmlFor={optionId}
              key={option.value}
            >
              <input
                checked={value === option.value}
                className="accent-primary mt-0.5 size-5 shrink-0"
                disabled={option.isDisabled}
                id={optionId}
                name={name}
                onBlur={onBlur}
                onChange={() => onChange?.(option.value)}
                required={isRequired}
                type="radio"
                value={option.value}
              />
              <span className="grid min-w-0 gap-1">
                <span className="text-sm leading-5 font-semibold">
                  {option.label}
                </span>
                {option.description ? (
                  <span className="text-on-surface-variant text-sm leading-5">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          )
        })}
      </div>

      {isInvalid && errorMessage ? (
        <p className="text-error text-sm leading-5 font-medium" id={errorId}>
          {errorMessage}
        </p>
      ) : null}
    </fieldset>
  )
}
