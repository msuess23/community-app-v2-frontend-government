import { useCallback, useState } from 'react'
import {
  useForm,
  type DefaultValues,
  type FieldValues,
} from 'react-hook-form'
import type { ZodType } from 'zod'

import { useConfirmation } from '@/shared/confirmation/confirmation-context'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import {
  useResourceActionCloseGuard,
  useResourceActionDialog,
} from '@/shared/resource-detail/resource-action-dialog-context'
import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

/** Creates one guarded ticket-workflow dialog form with shared validation behavior. */
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
