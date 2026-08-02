import { createContext, useContext } from 'react'

export type ConfirmationTone = 'danger' | 'default'
export type ConfirmationInitialFocus = 'cancel' | 'confirm'

export type ConfirmationOptions = Readonly<{
  cancelLabel?: string
  confirmLabel?: string
  description: string
  initialFocus?: ConfirmationInitialFocus
  title: string
  tone?: ConfirmationTone
}>

export type ConfirmationContextValue = Readonly<{
  confirm: (options: ConfirmationOptions) => Promise<boolean>
}>

export const ConfirmationContext =
  createContext<ConfirmationContextValue | null>(null)

/** Returns the global API for requesting an accessible user confirmation. */
export function useConfirmation(): ConfirmationContextValue {
  const context = useContext(ConfirmationContext)

  if (!context) {
    throw new Error('useConfirmation must be used inside ConfirmationProvider.')
  }

  return context
}
