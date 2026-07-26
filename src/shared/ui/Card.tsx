import type { HTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

export type CardVariant = 'default' | 'subtle' | 'outlined'
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
  variant?: CardVariant
}

const variantStyles: Record<CardVariant, string> = {
  default:
    'border border-outline-variant bg-surface-container-lowest shadow-sm',
  subtle: 'bg-surface-container',
  outlined: 'border border-outline bg-surface-container-lowest',
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

export function Card({
  className,
  padding = 'md',
  variant = 'default',
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        'text-on-surface rounded-xl',
        variantStyles[variant],
        paddingStyles[padding],
        className,
      )}
    />
  )
}
