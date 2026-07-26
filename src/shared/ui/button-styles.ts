import { cn } from '@/shared/lib/cn'

export type ButtonVariant =
  'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'danger'

export type ButtonSize = 'sm' | 'md' | 'lg'

const baseStyles = [
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg',
  'font-semibold leading-none transition-colors duration-150',
  'focus-visible:outline-2 focus-visible:outline-offset-2',
  'disabled:pointer-events-none disabled:opacity-55',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-55',
]

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed focus-visible:outline-primary',
  secondary:
    'bg-secondary text-on-secondary hover:bg-secondary-hover active:bg-secondary-pressed focus-visible:outline-secondary',
  tertiary:
    'bg-tertiary text-on-tertiary hover:bg-tertiary-hover active:bg-tertiary-pressed focus-visible:outline-tertiary',
  outline:
    'border border-outline bg-surface text-primary hover:bg-primary-container active:bg-primary-container focus-visible:outline-primary',
  ghost:
    'bg-transparent text-primary hover:bg-primary-container active:bg-primary-container focus-visible:outline-primary',
  danger:
    'bg-error text-on-error hover:bg-error-hover active:bg-error-pressed focus-visible:outline-error',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
}

export function buttonStyles({
  className,
  size = 'md',
  variant = 'primary',
}: {
  className?: string
  size?: ButtonSize
  variant?: ButtonVariant
} = {}): string {
  return cn(baseStyles, variantStyles[variant], sizeStyles[size], className)
}
