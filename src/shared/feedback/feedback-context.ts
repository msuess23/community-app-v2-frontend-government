import { createContext, useContext } from 'react'

export type FeedbackTone = 'error' | 'info' | 'success' | 'warning'

export type FeedbackInput = Readonly<{
  autoDismissAfter?: number | null
  dedupeKey?: string
  description?: string
  title: string
  tone?: FeedbackTone
}>

export type FeedbackMessage = Readonly<{
  autoDismissAfter: number | null
  dedupeKey?: string
  description?: string
  id: string
  title: string
  tone: FeedbackTone
}>

export type FeedbackContextValue = Readonly<{
  clear: () => void
  dismiss: (id: string) => void
  notify: (input: FeedbackInput) => string
}>

export const FeedbackContext = createContext<FeedbackContextValue | null>(null)

/** Returns the global notification API for user-visible application feedback. */
export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext)

  if (!context) {
    throw new Error('useFeedback must be used inside FeedbackProvider.')
  }

  return context
}
