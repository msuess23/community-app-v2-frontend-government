import { X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react'
import { useForm } from 'react-hook-form'

import {
  createTicketImageRemovalValues,
  normalizeTicketImageRemovalReason,
  TICKET_IMAGE_REMOVAL_REASON_MAX_LENGTH,
  ticketImageRemovalSchema,
  type TicketImageRemovalFormValues,
} from '@/features/tickets/model/ticket-image-form'
import { getTicketImageErrorPresentation } from '@/features/tickets/model/ticket-image-errors'
import { useRemoveTicketImageMutation } from '@/features/tickets/queries/ticket-image-mutations'
import { useConfirmation } from '@/shared/confirmation/confirmation-context'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { ControlledTextAreaField } from '@/shared/forms/ControlledTextAreaField'
import { FormFieldScope } from '@/shared/forms/FormFieldScope'
import { applySubmissionError } from '@/shared/forms/apply-submission-error'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import type { MediaAsset } from '@/shared/media/media-model'
import { Button } from '@/shared/ui/Button'
import { FormActions } from '@/shared/ui/FormActions'
import {
  FormErrorSummary,
  type FormErrorSummaryItem,
} from '@/shared/ui/FormErrorSummary'
import { FormSubmitButton } from '@/shared/ui/FormSubmitButton'

export type TicketImageRemovalDialogProps = Readonly<{
  asset: MediaAsset | null
  onClose: () => void
  ticketId: string
}>

/** Collects an optional audit reason before removing a current image revision. */
export function TicketImageRemovalDialog({
  asset,
  onClose,
  ticketId,
}: TicketImageRemovalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const { confirm } = useConfirmation()
  const { notify } = useFeedback()
  const mutation = useRemoveTicketImageMutation()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const {
    control,
    formState: { errors, isDirty, isSubmitting, submitCount },
    handleSubmit,
    reset,
    setError,
  } = useForm<TicketImageRemovalFormValues>({
    defaultValues: createTicketImageRemovalValues(),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(ticketImageRemovalSchema),
    shouldFocusError: false,
  })
  const formErrors = [...submissionErrors, ...getFormErrorSummary(errors)]

  useEffect(() => {
    const dialog = dialogRef.current
    if (!asset || !dialog) {
      if (dialog?.open) {
        dialog.close()
      }
      return
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    reset(createTicketImageRemovalValues())
    setSubmissionErrors([])
    if (!dialog.open) {
      dialog.showModal()
    }
    requestAnimationFrame(() => closeButtonRef.current?.focus())
  }, [asset, reset])

  const closeDialog = useCallback(() => {
    if (dialogRef.current?.open) {
      dialogRef.current.close()
    }
    onClose()
    queueMicrotask(() => previousFocusRef.current?.focus())
  }, [onClose])

  const requestClose = useCallback(async () => {
    if (
      isDirty &&
      !(await confirm({
        confirmLabel: 'Eingabe verwerfen',
        description:
          'Die noch nicht gespeicherte Begründung geht verloren, wenn du den Dialog schließt.',
        title: 'Bildentfernung abbrechen?',
        tone: 'danger',
      }))
    ) {
      return
    }
    closeDialog()
  }, [closeDialog, confirm, isDirty])

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault()
    void requestClose()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>): void {
    if (event.key !== 'Escape') {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    void requestClose()
  }

  return (
    <dialog
      aria-describedby="ticket-image-removal-description"
      aria-labelledby="ticket-image-removal-title"
      aria-modal="true"
      className="backdrop:bg-scrim border-outline-variant bg-surface-container-lowest text-on-surface m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border p-0 shadow-2xl"
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      ref={dialogRef}
      role="dialog"
    >
      {asset ? (
        <div className="p-5 sm:p-6">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h2
                className="text-xl font-semibold tracking-tight sm:text-2xl"
                id="ticket-image-removal-title"
              >
                Bild entfernen
              </h2>
              <p
                className="text-on-surface-variant mt-2 leading-7"
                id="ticket-image-removal-description"
              >
                „{asset.originalFilename}“ verschwindet aus der aktuellen
                Bilderliste, bleibt aber als historische Revision erhalten.
                {asset.isCover
                  ? ' Das Backend bestimmt nach dem Entfernen gegebenenfalls ein neues Titelbild.'
                  : ''}
              </p>
            </div>
            <Button
              aria-label="Dialog zum Entfernen des Bildes schließen"
              onPress={() => void requestClose()}
              ref={closeButtonRef}
              size="sm"
              variant="ghost"
            >
              <X aria-hidden="true" size={20} />
            </Button>
          </header>

          <form
            className="mt-6 space-y-6"
            noValidate
            onSubmit={handleSubmit(async (values) => {
              setSubmissionErrors([])

              try {
                await mutation.mutateAsync({
                  imageId: asset.id,
                  reason: normalizeTicketImageRemovalReason(values.reason),
                  ticketId,
                })
                notify({
                  dedupeKey: `ticket-image-remove:${ticketId}:${asset.id}`,
                  description:
                    'Das Bild wurde aus der aktuellen Projektion entfernt. Die historische Revision und der unveränderliche Ereigniseintrag bleiben erhalten.',
                  title: 'Ticketbild entfernt',
                  tone: 'success',
                })
                closeDialog()
              } catch (error) {
                const presentation = getTicketImageErrorPresentation(error)
                setSubmissionErrors(
                  applySubmissionError(error, setError, {
                    fallbackMessage: `${presentation.title}: ${presentation.description}`,
                    fieldAliases: { reason: 'reason' },
                  }),
                )
              }
            })}
          >
            <FormFieldScope>
              <FormErrorSummary
                errors={formErrors}
                focusKey={submitCount}
                shouldFocus
              />
              <ControlledTextAreaField
                control={control}
                description="Optional und nur intern im Ereignis zur Bildentfernung gespeichert."
                label="Begründung"
                maxLength={TICKET_IMAGE_REMOVAL_REASON_MAX_LENGTH}
                name="reason"
                rows={4}
              />
              <FormActions>
                <Button
                  onPress={() => void requestClose()}
                  type="button"
                  variant="outline"
                >
                  Abbrechen
                </Button>
                <FormSubmitButton
                  isSubmitting={isSubmitting}
                  pendingLabel="Bild wird entfernt …"
                  variant="danger"
                >
                  Bild entfernen
                </FormSubmitButton>
              </FormActions>
            </FormFieldScope>
          </form>
        </div>
      ) : null}
    </dialog>
  )
}
