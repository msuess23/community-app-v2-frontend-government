import type { ReactNode } from 'react'

import { Button, type ButtonProps } from '@/shared/ui/Button'

export interface FormSubmitButtonProps extends Omit<
  ButtonProps,
  'children' | 'isDisabled' | 'type'
> {
  children: ReactNode
  isDisabled?: boolean
  isSubmitting: boolean
  pendingLabel: ReactNode
}

/** Prevents duplicate submissions and exposes the pending action in the button label. */
export function FormSubmitButton({
  children,
  isDisabled = false,
  isSubmitting,
  pendingLabel,
  ...props
}: FormSubmitButtonProps) {
  return (
    <Button
      {...props}
      aria-busy={isSubmitting || undefined}
      isDisabled={isDisabled || isSubmitting}
      type="submit"
    >
      {isSubmitting ? pendingLabel : children}
    </Button>
  )
}
