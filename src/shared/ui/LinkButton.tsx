import { Link, type LinkProps } from 'react-router'

import {
  buttonStyles,
  type ButtonSize,
  type ButtonVariant,
} from '@/shared/ui/button-styles'

export interface LinkButtonProps extends Omit<LinkProps, 'className'> {
  className?: string
  size?: ButtonSize
  variant?: ButtonVariant
}

export function LinkButton({
  className,
  size = 'md',
  variant = 'primary',
  ...props
}: LinkButtonProps) {
  return (
    <Link {...props} className={buttonStyles({ className, size, variant })} />
  )
}
