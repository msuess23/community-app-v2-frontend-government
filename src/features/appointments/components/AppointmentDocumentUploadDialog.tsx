import { FilePlus2, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react'
import { useForm, useWatch } from 'react-hook-form'

import {
  applyAppointmentDocumentSubmissionError,
  appointmentDocumentUploadSchema,
  createAppointmentDocumentUploadDefaults,
  getReplacementDocumentType,
  toAppointmentDocumentUploadRequest,
  type AppointmentDocumentUploadFormValues,
} from '@/features/appointments/model/appointment-document-form'
import {
  APPOINTMENT_DOCUMENT_MIME_TYPE,
  APPOINTMENT_DOCUMENT_TYPES,
  getAppointmentDocumentLabel,
  getAppointmentDocumentTypeLabel,
  type AppointmentDocumentRecord,
} from '@/features/appointments/model/appointment-document'
import { useUploadAppointmentDocumentMutation } from '@/features/appointments/queries/appointment-document-queries'
import { ControlledCheckboxField } from '@/shared/forms/ControlledCheckboxField'
import { ControlledFileUploadField } from '@/shared/forms/ControlledFileUploadField'
import { ControlledRadioGroupField } from '@/shared/forms/ControlledRadioGroupField'
import { ControlledSelectField } from '@/shared/forms/ControlledSelectField'
import { FormFieldScope } from '@/shared/forms/FormFieldScope'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { useUnsavedChangesGuard } from '@/shared/forms/use-unsaved-changes-guard'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import { Button } from '@/shared/ui/Button'
import { FormActions } from '@/shared/ui/FormActions'
import { FormErrorSummary, type FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'
import { FormSubmitButton } from '@/shared/ui/FormSubmitButton'

/** Owns the guarded multipart workflow for a new document group or replacement version. */
export function AppointmentDocumentUploadDialog({
  appointmentId,
  currentDocuments,
}: Readonly<{
  appointmentId: string
  currentDocuments: readonly AppointmentDocumentRecord[]
}>) {
  const [isOpen, setOpen] = useState(false)
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const closePendingRef = useRef(false)
  const dialogId = useId()
  const titleId = `${dialogId}-title`
  const descriptionId = `${dialogId}-description`
  const mutation = useUploadAppointmentDocumentMutation()
  const form = useForm<AppointmentDocumentUploadFormValues>({
    defaultValues: createAppointmentDocumentUploadDefaults(),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(appointmentDocumentUploadSchema),
    shouldFocusError: false,
  })
  const mode = useWatch({ control: form.control, name: 'mode' })
  const documentGroupId = useWatch({
    control: form.control,
    name: 'documentGroupId',
  })
  const files = useWatch({ control: form.control, name: 'files' }) ?? []
  const visibleToCitizen = useWatch({
    control: form.control,
    name: 'visibleToCitizen',
  })
  const hasUnsavedChanges = form.formState.isDirty || files.length > 0
  const { confirmDiscardChanges } = useUnsavedChangesGuard({
    hasUnsavedChanges,
    isEnabled: isOpen,
    message: {
      description:
        'Die ausgewählte PDF-Datei und die Dokumentangaben wurden noch nicht gespeichert.',
      title: 'Dokumentupload verwerfen?',
    },
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
      requestAnimationFrame(() => closeButtonRef.current?.focus())
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  useEffect(() => {
    if (mode === 'NEW' && documentGroupId) {
      form.setValue('documentGroupId', '', { shouldDirty: true })
      return
    }
    if (mode !== 'REPLACE' || !documentGroupId) return

    const replacementType = getReplacementDocumentType(
      documentGroupId,
      currentDocuments,
    )
    if (!replacementType) {
      form.setValue('documentGroupId', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
      return
    }

    form.setValue('documentType', replacementType, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }, [currentDocuments, documentGroupId, form, mode])

  const closeDialog = useCallback(() => {
    setOpen(false)
    form.reset(createAppointmentDocumentUploadDefaults())
    setSubmissionErrors([])
    queueMicrotask(() => triggerRef.current?.focus())
  }, [form])

  const requestClose = useCallback(async () => {
    if (closePendingRef.current || mutation.isPending) return
    closePendingRef.current = true
    try {
      if (await confirmDiscardChanges()) closeDialog()
    } finally {
      closePendingRef.current = false
    }
  }, [closeDialog, confirmDiscardChanges, mutation.isPending])

  async function submit(values: AppointmentDocumentUploadFormValues) {
    setSubmissionErrors([])
    try {
      await mutation.mutateAsync({
        appointmentId,
        request: toAppointmentDocumentUploadRequest(values),
      })
      closeDialog()
    } catch (error) {
      setSubmissionErrors(
        applyAppointmentDocumentSubmissionError(error, form.setError),
      )
    }
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    void requestClose()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    void requestClose()
  }

  const errors = [
    ...submissionErrors,
    ...getFormErrorSummary(form.formState.errors),
  ]
  const groupOptions = currentDocuments.map((document) => ({
    label: getAppointmentDocumentLabel(document),
    value: document.documentGroupId,
  }))
  const typeOptions = APPOINTMENT_DOCUMENT_TYPES.map((documentType) => ({
    label: getAppointmentDocumentTypeLabel(documentType),
    value: documentType,
  }))

  return (
    <>
      <Button onPress={() => setOpen(true)} ref={triggerRef}>
        <FilePlus2 aria-hidden="true" size={18} />
        PDF hochladen
      </Button>

      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="backdrop:bg-scrim border-outline-variant bg-surface-container-lowest text-on-surface m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border p-0 shadow-2xl"
        onCancel={handleCancel}
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
      >
        <div className="p-5 sm:p-6">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <h2
                className="text-xl font-semibold tracking-tight sm:text-2xl"
                id={titleId}
              >
                Termindokument hochladen
              </h2>
              <p
                className="text-on-surface-variant leading-7"
                id={descriptionId}
              >
                PDFs werden unveränderlich gespeichert. Eine Ersatzversion
                erhält eine neue Versionsnummer; ältere Versionen bleiben
                erhalten.
              </p>
            </div>
            <Button
              aria-label="Dokumentdialog schließen"
              isDisabled={mutation.isPending}
              onPress={() => void requestClose()}
              ref={closeButtonRef}
              size="sm"
              variant="ghost"
            >
              <X aria-hidden="true" size={20} />
            </Button>
          </header>

          <form
            aria-busy={mutation.isPending}
            className="mt-6 space-y-6"
            noValidate
            onSubmit={form.handleSubmit(submit)}
          >
            <FormFieldScope>
              <FormErrorSummary
                errors={errors}
                focusKey={form.formState.submitCount}
                shouldFocus
              />

              <ControlledRadioGroupField
                control={form.control}
                description="Lege einen neuen Dokumentstamm an oder ergänze eine unveränderliche Version einer vorhandenen Gruppe."
                isRequired
                label="Uploadart"
                name="mode"
                options={[
                  {
                    description: 'Beginnt mit Version 1.',
                    label: 'Neue Dokumentgruppe',
                    value: 'NEW',
                  },
                  {
                    description:
                      'Der bisherige Stand bleibt in der Versionshistorie erhalten.',
                    isDisabled: currentDocuments.length === 0,
                    label: 'Bestehendes Dokument ersetzen',
                    value: 'REPLACE',
                  },
                ]}
              />

              {mode === 'REPLACE' ? (
                <ControlledSelectField
                  control={form.control}
                  description="Nur die aktuelle Version einer Dokumentgruppe kann durch eine neue Version ergänzt werden."
                  label="Dokumentgruppe"
                  name="documentGroupId"
                  options={groupOptions}
                  placeholder="Dokumentgruppe auswählen"
                  required
                />
              ) : null}

              <ControlledSelectField
                control={form.control}
                description={
                  mode === 'REPLACE'
                    ? 'Der Dokumenttyp ist für alle Versionen dieser Gruppe unveränderlich.'
                    : 'Der Typ beschreibt den fachlichen Zweck der neuen Dokumentgruppe.'
                }
                disabled={mode === 'REPLACE'}
                label="Dokumenttyp"
                name="documentType"
                options={typeOptions}
                required
              />

              <ControlledFileUploadField
                accept={APPOINTMENT_DOCUMENT_MIME_TYPE}
                control={form.control}
                description="Genau eine gültige PDF-Datei, nicht leer und höchstens 10 MiB."
                isDisabled={mutation.isPending}
                isRequired
                label="PDF-Datei"
                name="files"
              />

              <ControlledCheckboxField
                control={form.control}
                description="Nur die jeweils aktuelle freigegebene Version erscheint im Bürger-Client."
                label="Aktuelle Version für den Bürger freigeben"
                name="visibleToCitizen"
              />

              <div
                className={
                  visibleToCitizen
                    ? 'border-primary bg-primary-container text-on-primary-container rounded-xl border p-4'
                    : 'border-secondary bg-secondary-container text-on-secondary-container rounded-xl border p-4'
                }
                aria-atomic="true"
                role="status"
              >
                <p className="font-semibold">
                  {visibleToCitizen
                    ? 'Für Bürger freigegeben'
                    : 'Internes Behördendokument'}
                </p>
                <p className="mt-1 text-sm leading-6">
                  {visibleToCitizen
                    ? 'Nach erfolgreichem Upload kann der Bürger diese aktuelle Version herunterladen.'
                    : 'Diese Version ist ausschließlich für Officer und Manager der zuständigen Behörde sichtbar.'}
                </p>
              </div>

              <FormActions>
                <Button
                  isDisabled={mutation.isPending}
                  onPress={() => void requestClose()}
                  type="button"
                  variant="outline"
                >
                  Abbrechen
                </Button>
                <FormSubmitButton
                  isSubmitting={mutation.isPending || form.formState.isSubmitting}
                  pendingLabel="PDF wird hochgeladen …"
                >
                  {mode === 'REPLACE'
                    ? 'Neue Version hochladen'
                    : 'Dokument hochladen'}
                </FormSubmitButton>
              </FormActions>
            </FormFieldScope>
          </form>
        </div>
      </dialog>
    </>
  )
}
