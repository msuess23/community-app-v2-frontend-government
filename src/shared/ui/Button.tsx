import { forwardRef } from 'react'
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
} from 'react-aria-components'

import {
  buttonStyles,
  type ButtonSize,
  type ButtonVariant,
} from '@/shared/ui/button-styles'

export interface ButtonProps extends Omit<
  AriaButtonProps,
  'className' | 'ref'
> {
  className?: string
  size?: ButtonSize
  variant?: ButtonVariant
}

/** Renders the shared accessible action button and exposes its DOM focus target. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, size = 'md', variant = 'primary', ...props },
    ref,
  ) {
    return (
      <AriaButton
        {...props}
        className={buttonStyles({ className, size, variant })}
        ref={ref}
      />
    )
  },
)
