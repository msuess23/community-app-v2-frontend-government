import { Save, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { OfficeAddressFields } from '@/features/offices/components/OfficeAddressFields'
import { OfficeOpeningHoursEditor } from '@/features/offices/components/OfficeOpeningHoursEditor'
import { OfficeServicesField } from '@/features/offices/components/OfficeServicesField'
import {
  applyOfficeSubmissionError,
  createEmptyOfficeFormValues,
  createOfficeFormSchema,
  hasOfficeChanges,
  toOfficeFormValues,
  type OfficeFormValues,
} from '@/features/offices/model/office-form'
import type { OfficeRecord } from '@/features/offices/model/office-model'
import { ControlledChangeReasonField } from '@/shared/forms/ControlledChangeReasonField'
import { ControlledTextAreaField } from '@/shared/forms/ControlledTextAreaField'
import { ControlledTextField } from '@/shared/forms/ControlledTextField'
import { FormFieldScope } from '@/shared/forms/FormFieldScope'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { useUnsavedChangesGuard } from '@/shared/forms/use-unsaved-changes-guard'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { FormActions } from '@/shared/ui/FormActions'
import {
  FormErrorSummary,
  type FormErrorSummaryItem,
} from '@/shared/ui/FormErrorSummary'
import { FormSection } from '@/shared/ui/FormSection'
import { FormSubmitButton } from '@/shared/ui/FormSubmitButton'

export interface OfficeFormProps {
  isPending: boolean
  mode: 'create' | 'edit'
  office?: OfficeRecord
  onCancel: () => void
  onSaved: (office: OfficeRecord) => void
  save: (values: OfficeFormValues) => Promise<OfficeRecord>
}

/** Renders the shared accessible office create/edit workflow. */
export function OfficeForm({
  isPending,
  mode,
  office,
  onCancel,
  onSaved,
  save,
}: OfficeFormProps) {
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const schema = useMemo(() => createOfficeFormSchema(mode), [mode])
  const initialValues = useMemo(
    () => (office ? toOfficeFormValues(office) : createEmptyOfficeFormValues()),
    [office],
  )
  const {
    control,
    formState: { errors, isDirty, isSubmitting, submitCount },
    handleSubmit,
    reset,
    setError,
  } = useForm<OfficeFormValues>({
    defaultValues: initialValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(schema),
    shouldFocusError: false,
  })
  const currentValues = useWatch({ control }) as OfficeFormValues
  const hasMasterDataChanges = office
    ? hasOfficeChanges(currentValues, office)
    : isDirty
  const { confirmDiscardChanges } = useUnsavedChangesGuard({
    hasUnsavedChanges: isDirty,
  })
  const formErrors = [...submissionErrors, ...getFormErrorSummary(errors)]

  async function cancel(): Promise<void> {
    const accepted = await confirmDiscardChanges()
    if (accepted) {
      onCancel()
    }
  }

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setSubmissionErrors([])

        try {
          const savedOffice = await save(values)
          reset(toOfficeFormValues(savedOffice))
          onSaved(savedOffice)
        } catch (error) {
          setSubmissionErrors(applyOfficeSubmissionError(error, setError))
        }
      })}
    >
      <FormFieldScope>
        <FormErrorSummary
          errors={formErrors}
          focusKey={submitCount}
          shouldFocus
        />

        <div className="grid items-start gap-6 xl:grid-cols-2">
          <Card>
            <FormSection
              description="Der Name muss eine Behörde nicht eindeutig identifizieren. Ort und Kontakt helfen bei gleichnamigen Einträgen."
              requiredFieldsHint
              title="Grunddaten"
            >
              <div className="grid gap-5">
                <ControlledTextField
                  autoComplete="organization"
                  control={control}
                  isRequired
                  label="Name der Behörde"
                  maxLength={150}
                  name="name"
                />
                <ControlledTextAreaField
                  control={control}
                  label="Beschreibung"
                  maxLength={1000}
                  name="description"
                  rows={7}
                />
              </div>
            </FormSection>
          </Card>

          <Card>
            <FormSection
              description="Optionale Kontaktwege werden auf der Behördendetailseite als direkt nutzbare Links angezeigt."
              title="Kontakt"
            >
              <div className="grid gap-5">
                <ControlledTextField
                  autoComplete="email"
                  control={control}
                  inputMode="email"
                  label="Kontakt-E-Mail-Adresse"
                  maxLength={254}
                  name="contactEmail"
                  type="email"
                />
                <ControlledTextField
                  autoComplete="tel"
                  control={control}
                  inputMode="tel"
                  label="Telefonnummer"
                  maxLength={50}
                  name="phone"
                  type="tel"
                />
              </div>
            </FormSection>
          </Card>
        </div>

        <Card>
          <FormSection
            description="Leistungen werden in der angegebenen Reihenfolge veröffentlicht. Doppelte Einträge sind nicht zulässig."
            title="Leistungen"
          >
            <OfficeServicesField control={control} />
          </FormSection>
        </Card>

        <Card>
          <FormSection
            description="Wähle für jeden Wochentag zwischen keiner Angabe, geschlossen oder strukturierten Zeitintervallen."
            title="Öffnungszeiten"
          >
            <OfficeOpeningHoursEditor control={control} />
          </FormSection>
        </Card>

        <Card>
          <FormSection
            description="Eine aktivierte Adresse muss vollständig aus Straße, Hausnummer, Postleitzahl und Ort bestehen."
            requiredFieldsHint
            title="Adresse"
          >
            <OfficeAddressFields
              control={control}
              hasExistingAddress={Boolean(office?.address)}
              hasStoredCoordinates={Boolean(
                office?.address &&
                  (office.address.latitude !== null ||
                    office.address.longitude !== null),
              )}
            />
          </FormSection>
        </Card>

        {mode === 'edit' ? (
          <Card>
            <FormSection
              description="Der Grund wird dauerhaft zusammen mit dem resultierenden Behördenstand gespeichert."
              requiredFieldsHint
              title="Nachvollziehbarkeit"
            >
              <ControlledChangeReasonField
                control={control}
                name="changeReason"
              />
            </FormSection>
          </Card>
        ) : null}

        <FormActions className="bg-surface/95 sticky bottom-0 z-20 rounded-xl px-4 pb-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:px-5">
          <Button
            isDisabled={isSubmitting || isPending}
            onPress={() => void cancel()}
            type="button"
            variant="outline"
          >
            {mode === 'edit' ? 'Zurück zur Behörde' : 'Abbrechen'}
          </Button>
          <Button
            isDisabled={!isDirty || isSubmitting || isPending}
            onPress={() => {
              reset(initialValues)
              setSubmissionErrors([])
            }}
            type="button"
            variant="outline"
          >
            <Undo2 aria-hidden="true" size={18} />
            Änderungen verwerfen
          </Button>
          <FormSubmitButton
            isDisabled={!hasMasterDataChanges || isPending}
            isSubmitting={isSubmitting || isPending}
            pendingLabel={
              mode === 'edit'
                ? 'Behörde wird gespeichert …'
                : 'Behörde wird angelegt …'
            }
          >
            <Save aria-hidden="true" size={18} />
            {mode === 'edit' ? 'Änderungen speichern' : 'Behörde anlegen'}
          </FormSubmitButton>
        </FormActions>
      </FormFieldScope>
    </form>
  )
}
