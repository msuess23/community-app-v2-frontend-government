import { Save, Undo2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import type { AuthUser } from '@/auth/auth-types'
import { InfoAddressFields } from '@/features/infos/components/InfoAddressFields'
import { InfoOfficeField } from '@/features/infos/components/InfoOfficeField'
import {
  applyInfoSubmissionError,
  createEmptyInfoFormValues,
  createInfoFormSchema,
  hasInfoChanges,
  toInfoFormValues,
  type InfoFormValues,
} from '@/features/infos/model/info-form'
import {
  getInfoCategoryLabel,
  INFO_CATEGORIES,
  type InfoRecord,
} from '@/features/infos/model/info-model'
import { ControlledSelectField } from '@/shared/forms/ControlledSelectField'
import { ControlledTextAreaField } from '@/shared/forms/ControlledTextAreaField'
import { ControlledTextField } from '@/shared/forms/ControlledTextField'
import { FormFieldScope } from '@/shared/forms/FormFieldScope'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { useUnsavedChangesGuard } from '@/shared/forms/use-unsaved-changes-guard'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import type { OfficeReference } from '@/shared/offices/office-model'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { FormActions } from '@/shared/ui/FormActions'
import {
  FormErrorSummary,
  type FormErrorSummaryItem,
} from '@/shared/ui/FormErrorSummary'
import { FormSection } from '@/shared/ui/FormSection'
import { FormSubmitButton } from '@/shared/ui/FormSubmitButton'

export interface InfoFormProps {
  currentUser: AuthUser
  info?: InfoRecord
  imageSection?: ReactNode
  isPending: boolean
  mode: 'create' | 'edit'
  offices: readonly OfficeReference[]
  onCancel: () => void
  onSaved: (info: InfoRecord) => void
  save: (values: InfoFormValues) => Promise<InfoRecord>
  validateBeforeSave?: () => readonly FormErrorSummaryItem[]
}

/** Renders the shared accessible Info create/edit workflow. */
export function InfoForm({
  currentUser,
  imageSection,
  info,
  isPending,
  mode,
  offices,
  onCancel,
  onSaved,
  save,
  validateBeforeSave,
}: InfoFormProps) {
  const [submissionErrors, setSubmissionErrors] = useState<
    FormErrorSummaryItem[]
  >([])
  const schema = useMemo(() => createInfoFormSchema(), [])
  const initialValues = useMemo(
    () =>
      info ? toInfoFormValues(info) : createEmptyInfoFormValues(currentUser),
    [currentUser, info],
  )
  const {
    control,
    formState: { errors, isDirty, isSubmitting, submitCount },
    handleSubmit,
    reset,
    setError,
  } = useForm<InfoFormValues>({
    defaultValues: initialValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(schema),
    shouldFocusError: false,
  })
  const currentValues = useWatch({ control }) as InfoFormValues
  const hasMasterDataChanges = info
    ? hasInfoChanges(currentValues, info, currentUser)
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
        const preparationErrors = validateBeforeSave?.() ?? []
        setSubmissionErrors([...preparationErrors])
        if (preparationErrors.length > 0) {
          return
        }

        try {
          const savedInfo = await save(values)
          reset(toInfoFormValues(savedInfo))
          onSaved(savedInfo)
        } catch (error) {
          setSubmissionErrors(applyInfoSubmissionError(error, setError))
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
              description="Titel, Beschreibung und Kategorie bilden den veröffentlichten Inhalt der Mitteilung."
              requiredFieldsHint
              title="Inhalt"
            >
              <div className="grid gap-5">
                <ControlledTextField
                  control={control}
                  isRequired
                  label="Titel"
                  maxLength={255}
                  name="title"
                />
                <ControlledTextAreaField
                  control={control}
                  label="Beschreibung"
                  maxLength={5000}
                  name="description"
                  rows={9}
                />
                <ControlledSelectField
                  control={control}
                  label="Kategorie"
                  required
                  name="category"
                  options={INFO_CATEGORIES.map((category) => ({
                    label: getInfoCategoryLabel(category),
                    value: category,
                  }))}
                />
              </div>
            </FormSection>
          </Card>

          <div className="space-y-6">
            <Card>
              <FormSection
                description="Beginn und Ende werden als lokale Zeit für Europe/Berlin erfasst und mit Zeitzone an das Backend übertragen."
                requiredFieldsHint
                title="Zeitraum"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <ControlledTextField
                    control={control}
                    inputLang="de-DE"
                    isRequired
                    label="Beginn"
                    name="startsAt"
                    step={60}
                    type="datetime-local"
                  />
                  <ControlledTextField
                    control={control}
                    inputLang="de-DE"
                    isRequired
                    label="Ende"
                    name="endsAt"
                    step={60}
                    type="datetime-local"
                  />
                </div>
              </FormSection>
            </Card>

            <Card>
              <FormSection
                description="Die Backendberechtigung bleibt maßgeblich für jede konkrete Behördenzuordnung."
                title="Zuständigkeit"
              >
                <InfoOfficeField
                  control={control}
                  currentUser={currentUser}
                  info={info}
                  offices={offices}
                />
              </FormSection>
            </Card>
          </div>
        </div>

        <Card>
          <FormSection
            description="Eine aktivierte Adresse muss vollständig aus Straße, Hausnummer, Postleitzahl und Ort bestehen."
            requiredFieldsHint
            title="Adresse"
          >
            <InfoAddressFields
              control={control}
              hasExistingAddress={Boolean(info?.address)}
              hasStoredCoordinates={Boolean(
                info?.address &&
                  (info.address.latitude !== null ||
                    info.address.longitude !== null),
              )}
            />
          </FormSection>
        </Card>

        {imageSection ? (
          <Card>
            <FormSection
              description={
                mode === 'create'
                  ? 'Die Stammdaten werden zuerst angelegt. Anschließend lädt derselbe Speichervorgang die ausgewählten Bilder nacheinander hoch.'
                  : 'Bild-Uploads, Titelbildwechsel und Löschungen werden unmittelbar über die separaten Bildendpunkte gespeichert.'
              }
              title="Bilder"
            >
              {imageSection}
            </FormSection>
          </Card>
        ) : null}

        <FormActions>
          <Button
            isDisabled={isSubmitting || isPending}
            onPress={() => void cancel()}
            type="button"
            variant="outline"
          >
            {mode === 'edit' ? 'Zurück zur Mitteilung' : 'Abbrechen'}
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
                ? 'Mitteilung wird gespeichert …'
                : 'Mitteilung wird angelegt …'
            }
          >
            <Save aria-hidden="true" size={18} />
            {mode === 'edit' ? 'Änderungen speichern' : 'Mitteilung anlegen'}
          </FormSubmitButton>
        </FormActions>
      </FormFieldScope>
    </form>
  )
}
