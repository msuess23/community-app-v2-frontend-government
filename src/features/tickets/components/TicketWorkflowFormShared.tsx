import { useQuery } from '@tanstack/react-query'
import {
  useCallback,
  useState,
  type FormEventHandler,
  type ReactNode,
} from 'react'
import {
  useForm,
  type Control,
  type DefaultValues,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form'
import type { ZodType } from 'zod'

import {
  getStaffOptionDescription,
  type TicketWorkflowOptions,
  type TicketWorkflowUserOption,
} from '@/features/tickets/model/ticket-workflow'
import type { TicketRecord } from '@/features/tickets/model/ticket-model'
import { createTicketWorkflowOptionsQueryOptions } from '@/features/tickets/queries/ticket-queries'
import { useConfirmation } from '@/shared/confirmation/confirmation-context'
import { ControlledSearchableSelectField } from '@/shared/forms/ControlledSearchableSelectField'
import { ControlledTextAreaField } from '@/shared/forms/ControlledTextAreaField'
import { FormFieldScope } from '@/shared/forms/FormFieldScope'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import {
  useResourceActionCloseGuard,
  useResourceActionDialog,
} from '@/shared/resource-detail/resource-action-dialog-context'
import { FormActions } from '@/shared/ui/FormActions'
import {
  FormErrorSummary,
  type FormErrorSummaryItem,
} from '@/shared/ui/FormErrorSummary'
import { FormSubmitButton } from '@/shared/ui/FormSubmitButton'

/** Loads only the workflow targets currently permitted for this ticket and actor. */
export function WorkflowOptionsBoundary({
  children,
  ticket,
}: Readonly<{
  children: (options: TicketWorkflowOptions) => ReactNode
  ticket: TicketRecord
}>) {
  const query = useQuery(createTicketWorkflowOptionsQueryOptions(ticket.id))

  return (
    <RemoteDataBoundary
      errorOptions={{
        fallback: {
          description:
            'Die zulässigen Auswahlmöglichkeiten konnten nicht geladen werden. Versuche es erneut.',
          title: 'Auswahlmöglichkeiten nicht verfügbar',
        },
      }}
      loadingLabel="Zulässige Auswahlmöglichkeiten werden geladen."
      query={query}
    >
      {(options) => (
        <div className="space-y-4">
          {options.version !== ticket.version ? (
            <div
              className="border-secondary bg-secondary-container text-on-secondary-container rounded-lg border p-4"
              role="status"
            >
              Die Auswahl wurde für einen anderen Ticketstand geladen. Beim
              Absenden prüft das Backend den aktuellen Stand erneut.
            </div>
          ) : null}
          {children(options)}
        </div>
      )}
    </RemoteDataBoundary>
  )
}

/** Renders the optional event comment shared by several workflow commands. */
export function OptionalCommentField<
  TValues extends FieldValues & { comment: string },
>({
  control,
  description =
    'Optionaler interner Hinweis, der zusammen mit der Aktion im Ereignisstrom gespeichert wird.',
}: Readonly<{
  control: Control<TValues>
  description?: string
}>) {
  return (
    <ControlledTextAreaField
      control={control}
      description={description}
      label="Optionaler Kommentar"
      maxLength={1000}
      name={'comment' as FieldPath<TValues>}
      rows={4}
    />
  )
}

/** Presents server-filtered staff choices with role and office context. */
export function StaffSelectionField<TValues extends FieldValues>({
  control,
  description,
  label,
  name,
  options,
}: Readonly<{
  control: Control<TValues>
  description: string
  label: string
  name: FieldPath<TValues>
  options: readonly TicketWorkflowUserOption[]
}>) {
  return (
    <ControlledSearchableSelectField
      control={control}
      description={description}
      label={label}
      name={name}
      options={options.map((option) => ({
        description: getStaffOptionDescription(option),
        label: option.displayName,
        value: option.id,
      }))}
      placeholder="Person auswählen"
      required
      searchLabel="Personen durchsuchen"
    />
  )
}

/** Explains a valid action for which no selectable target currently remains. */
export function EmptyOptionsNotice({
  hasOptions,
  message,
}: Readonly<{ hasOptions: boolean; message: string }>) {
  if (hasOptions) return null

  return (
    <div
      className="border-outline-variant bg-surface-container text-on-surface-variant rounded-lg border p-4 leading-7"
      role="status"
    >
      {message}
    </div>
  )
}

/** Provides consistent error focus, pending state and submit layout for commands. */
export function WorkflowForm<TValues extends FieldValues>({
  children,
  form,
  isDisabled = false,
  onSubmit,
  pendingLabel,
  submissionErrors,
  submitLabel,
  submitVariant = 'primary',
}: Readonly<{
  children: ReactNode
  form: UseFormReturn<TValues>
  isDisabled?: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  pendingLabel: string
  submissionErrors: readonly FormErrorSummaryItem[]
  submitLabel: string
  submitVariant?: 'danger' | 'primary'
}>) {
  const formErrors = [
    ...submissionErrors,
    ...getFormErrorSummary(form.formState.errors),
  ]

  return (
    <form className="space-y-6" noValidate onSubmit={onSubmit}>
      <FormFieldScope>
        <FormErrorSummary
          errors={formErrors}
          focusKey={form.formState.submitCount}
          shouldFocus
        />
        {children}
        <FormActions>
          <FormSubmitButton
            isDisabled={isDisabled}
            isSubmitting={form.formState.isSubmitting}
            pendingLabel={pendingLabel}
            variant={submitVariant}
          >
            {submitLabel}
          </FormSubmitButton>
        </FormActions>
      </FormFieldScope>
    </form>
  )
}

/** Creates one guarded dialog form with the feature's common validation behavior. */
export function useWorkflowDialogForm<TValues extends FieldValues>({
  defaultValues,
  discardDescription,
  schema,
}: Readonly<{
  defaultValues: DefaultValues<TValues>
  discardDescription: string
  schema: ZodType<TValues>
}>) {
  const { confirm } = useConfirmation()
  const { close } = useResourceActionDialog()
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const form = useForm<TValues>({
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(schema),
    shouldFocusError: false,
  })
  const requestClose = useCallback(async () => {
    if (!form.formState.isDirty) return true

    return confirm({
      confirmLabel: 'Eingaben verwerfen',
      description: discardDescription,
      title: 'Ticketaktion abbrechen?',
    })
  }, [confirm, discardDescription, form.formState.isDirty])
  useResourceActionCloseGuard(requestClose)

  return { close, form, setSubmissionErrors, submissionErrors }
}
