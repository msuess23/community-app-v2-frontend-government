import { useId, type HTMLAttributes, type ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export interface FormSectionProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'title'
> {
  children: ReactNode
  description?: ReactNode
  headingId?: string
  headingLevel?: 2 | 3
  requiredFieldsHint?: boolean
  title: ReactNode
}

/** Groups related form controls beneath a named, screen-reader discoverable section. */
export function FormSection({
  children,
  className,
  description,
  headingId: providedHeadingId,
  headingLevel = 2,
  requiredFieldsHint = false,
  title,
  ...props
}: FormSectionProps) {
  const generatedId = useId()
  const headingId = providedHeadingId ?? `${generatedId}-heading`
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <section
      {...props}
      aria-labelledby={headingId}
      className={cn('space-y-6', className)}
    >
      <div className="space-y-2">
        <Heading
          className={cn(
            'font-semibold tracking-tight',
            headingLevel === 2 ? 'text-2xl' : 'text-xl',
          )}
          id={headingId}
        >
          {title}
        </Heading>
        {description ? (
          <div className="text-on-surface-variant max-w-3xl leading-7">
            {description}
          </div>
        ) : null}
        {requiredFieldsHint ? <RequiredFieldsHint /> : null}
      </div>
      {children}
    </section>
  )
}

/** Explains the shared required-field marker once per form section. */
export function RequiredFieldsHint() {
  return (
    <p className="text-on-surface-variant text-sm leading-5">
      Mit{' '}
      <span aria-hidden="true" className="text-error font-semibold">
        *
      </span>{' '}
      gekennzeichnete Felder sind Pflichtfelder.
    </p>
  )
}
