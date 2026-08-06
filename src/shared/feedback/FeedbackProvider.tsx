import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  FeedbackContext,
  type FeedbackContextValue,
  type FeedbackInput,
  type FeedbackMessage,
  type FeedbackTone,
} from '@/shared/feedback/feedback-context'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'

const DEFAULT_AUTO_DISMISS_MS = 6_000
let feedbackSequence = 0

type FeedbackProviderProps = Readonly<{
  children: ReactNode
}>

type FeedbackNoticeProps = Readonly<{
  dismiss: (id: string) => void
  message: FeedbackMessage
}>

const noticeStyles: Record<FeedbackTone, string> = {
  error: 'border-error bg-error-container text-on-error-container',
  info: 'border-primary bg-primary-container text-on-primary-container',
  success: 'border-tertiary bg-tertiary-container text-on-tertiary-container',
  warning:
    'border-secondary bg-secondary-container text-on-secondary-container',
}

const noticeIcons = {
  error: AlertCircle,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
} satisfies Record<FeedbackTone, typeof Info>

/** Provides a shared queue for transient and persistent application feedback. */
export function FeedbackProvider({ children }: FeedbackProviderProps) {
  const [messages, setMessages] = useState<FeedbackMessage[]>([])
  const messagesRef = useRef<FeedbackMessage[]>([])

  /** Removes one notification without affecting other pending feedback. */
  const dismiss = useCallback((id: string): void => {
    const nextMessages = messagesRef.current.filter(
      (message) => message.id !== id,
    )
    messagesRef.current = nextMessages
    setMessages(nextMessages)
  }, [])

  /** Removes all notifications, for example after a session boundary changes. */
  const clear = useCallback((): void => {
    messagesRef.current = []
    setMessages([])
  }, [])

  /** Adds feedback and optionally suppresses a duplicate that is already visible. */
  const notify = useCallback((input: FeedbackInput): string => {
    const duplicate = input.dedupeKey
      ? messagesRef.current.find(
          (message) => message.dedupeKey === input.dedupeKey,
        )
      : undefined

    if (duplicate) {
      return duplicate.id
    }

    const message: FeedbackMessage = {
      autoDismissAfter: getAutoDismissDelay(input),
      dedupeKey: input.dedupeKey,
      description: input.description,
      id: createFeedbackId(),
      title: input.title,
      tone: input.tone ?? 'info',
    }
    const nextMessages = [...messagesRef.current, message]
    messagesRef.current = nextMessages
    setMessages(nextMessages)

    return message.id
  }, [])

  const value = useMemo<FeedbackContextValue>(
    () => ({ clear, dismiss, notify }),
    [clear, dismiss, notify],
  )

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div
        aria-label="Benachrichtigungen"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex max-h-[calc(100vh-2rem)] flex-col items-end gap-3 overflow-y-auto sm:left-auto sm:w-full sm:max-w-md"
        role="region"
      >
        {messages.map((message) => (
          <FeedbackNotice
            dismiss={dismiss}
            key={message.id}
            message={message}
          />
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}

/** Renders one accessible notification and owns its optional dismissal timer. */
function FeedbackNotice({ dismiss, message }: FeedbackNoticeProps) {
  const Icon = noticeIcons[message.tone]

  useEffect(() => {
    if (message.autoDismissAfter === null) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      dismiss(message.id)
    }, message.autoDismissAfter)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [dismiss, message.autoDismissAfter, message.id])

  return (
    <section
      aria-atomic="true"
      className={cn(
        'pointer-events-none w-full rounded-xl border p-4 shadow-lg',
        noticeStyles[message.tone],
      )}
      role={
        message.tone === 'error' || message.tone === 'warning'
          ? 'alert'
          : 'status'
      }
    >
      <div className="flex items-start gap-3">
        <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={20} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{message.title}</p>
          {message.description ? (
            <p className="mt-1 text-sm leading-6">{message.description}</p>
          ) : null}
        </div>
        <Button
          aria-label={`Benachrichtigung „${message.title}“ schließen`}
          className="pointer-events-auto -m-2 shrink-0 text-current hover:bg-black/5 focus-visible:outline-current active:bg-black/10"
          onPress={() => dismiss(message.id)}
          size="sm"
          variant="ghost"
        >
          <X aria-hidden="true" size={18} />
        </Button>
      </div>
    </section>
  )
}

/** Creates a stable identifier without relying on browser-specific UUID support. */
function createFeedbackId(): string {
  feedbackSequence += 1
  return `feedback-${feedbackSequence}`
}

/** Applies conservative defaults so critical feedback never disappears automatically. */
function getAutoDismissDelay(input: FeedbackInput): number | null {
  if (input.autoDismissAfter !== undefined) {
    return input.autoDismissAfter
  }

  return input.tone === 'error' || input.tone === 'warning'
    ? null
    : DEFAULT_AUTO_DISMISS_MS
}
