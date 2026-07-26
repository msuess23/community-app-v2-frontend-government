import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
} from 'react-aria-components'

import {
  buttonStyles,
  type ButtonSize,
  type ButtonVariant,
} from '@/shared/ui/button-styles'

export interface ButtonProps extends Omit<AriaButtonProps, 'className'> {
  className?: string
  size?: ButtonSize
  variant?: ButtonVariant
}

export function Button({
  className,
  size = 'md',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={buttonStyles({ className, size, variant })}
    />
  )
}
