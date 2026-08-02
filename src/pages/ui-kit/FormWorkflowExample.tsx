import { RotateCcw, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useFeedback } from '@/shared/feedback/feedback-context'
import { ControlledFileUploadField } from '@/shared/forms/ControlledFileUploadField'
import { ControlledRadioGroupField } from '@/shared/forms/ControlledRadioGroupField'
import { ControlledSelectField } from '@/shared/forms/ControlledSelectField'
import { ControlledTextAreaField } from '@/shared/forms/ControlledTextAreaField'
import { ControlledTextField } from '@/shared/forms/ControlledTextField'
import { getFormErrorSummary } from '@/shared/forms/form-errors'
import { useUnsavedChangesGuard } from '@/shared/forms/use-unsaved-changes-guard'
import { createZodResolver } from '@/shared/forms/zod-resolver'
import { Button } from '@/shared/ui/Button'
import { FormActions } from '@/shared/ui/FormActions'
import { FormErrorSummary } from '@/shared/ui/FormErrorSummary'
import { FormSection } from '@/shared/ui/FormSection'
import { FormSubmitButton } from '@/shared/ui/FormSubmitButton'
import { LinkButton } from '@/shared/ui/LinkButton'

const exampleSchema = z.object({
  category: z.string().min(1, 'Bitte wähle einen Bereich aus.'),
  description: z
    .string()
    .trim()
    .min(10, 'Die Beschreibung muss mindestens zehn Zeichen haben.')
    .max(1000, 'Die Beschreibung darf höchstens 1000 Zeichen haben.'),
  dueDate: z.string().min(1, 'Bitte wähle ein Datum aus.'),
  dueTime: z.string(),
  files: z
    .array(z.instanceof(File))
    .max(3, 'Es können höchstens drei Dateien ausgewählt werden.'),
  priority: z.enum(['normal', 'urgent']),
  subject: z
    .string()
    .trim()
    .min(3, 'Der Betreff muss mindestens drei Zeichen haben.')
    .max(120, 'Der Betreff darf höchstens 120 Zeichen haben.'),
})

type ExampleFormValues = z.infer<typeof exampleSchema>

const defaultValues: ExampleFormValues = {
  category: '',
  description: '',
  dueDate: '',
  dueTime: '',
  files: [],
  priority: 'normal',
  subject: '',
}

/** Demonstrates long-form structure, validation, file selection and navigation protection. */
export function FormWorkflowExample() {
  const { notify } = useFeedback()
  const {
    control,
    formState: { errors, isDirty, isSubmitting, submitCount },
    handleSubmit,
    reset,
  } = useForm<ExampleFormValues>({
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: createZodResolver(exampleSchema),
    shouldFocusError: false,
  })

  useUnsavedChangesGuard({ hasUnsavedChanges: isDirty })

  return (
    <form
      className="space-y-8"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        await Promise.resolve()
        reset({ ...values, files: [] })
        notify({
          description:
            'Der Beispielstand wurde übernommen und gilt nicht mehr als ungespeichert.',
          title: 'Formular gespeichert',
          tone: 'success',
        })
      })}
    >
      <FormErrorSummary
        errors={getFormErrorSummary(errors)}
        focusKey={submitCount}
        shouldFocus
      />

      <FormSection
        description={
          <p>
            Der Entwicklungsbaustein zeigt Felder, die später in fachlichen
            Erfassungs- und Aktionsdialogen wiederverwendet werden.
          </p>
        }
        headingLevel={3}
        requiredFieldsHint
        title="Beispielvorgang"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <ControlledTextField
            control={control}
            isRequired
            label="Betreff"
            name="subject"
          />
          <ControlledSelectField
            control={control}
            description="Die Auswahl bleibt bewusst statisch; entfernte Suchauswahlen erhalten später eine Combobox."
            label="Bereich"
            name="category"
            options={[
              { label: 'Allgemeine Verwaltung', value: 'general' },
              { label: 'Straßen und Verkehr', value: 'traffic' },
              { label: 'Umwelt und Ordnung', value: 'environment' },
            ]}
            placeholder="Bereich auswählen"
            required
          />
        </div>

        <ControlledTextAreaField
          control={control}
          description="Beschreibe den Sachverhalt so, dass die nächste bearbeitende Person ihn nachvollziehen kann."
          isRequired
          label="Beschreibung"
          name="description"
          rows={6}
        />

        <ControlledRadioGroupField
          control={control}
          description="Alle Möglichkeiten sind gleichzeitig sichtbar und per Tastatur erreichbar."
          isRequired
          label="Priorität"
          name="priority"
          options={[
            {
              description: 'Bearbeitung im regulären Arbeitsvorrat',
              label: 'Normal',
              value: 'normal',
            },
            {
              description: 'Zeitnahe Prüfung erforderlich',
              label: 'Dringend',
              value: 'urgent',
            },
          ]}
          orientation="horizontal"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <ControlledTextField
            control={control}
            isRequired
            label="Fälligkeitsdatum"
            name="dueDate"
            type="date"
          />
          <ControlledTextField
            control={control}
            description="Optional; die Zeitzoneninterpretation erfolgt erst beim Fachvertrag."
            label="Fälligkeitszeit"
            name="dueTime"
            type="time"
          />
        </div>

        <ControlledFileUploadField
          accept="image/png,image/jpeg,application/pdf"
          control={control}
          description="Beispielhaft sind Bilder und PDF-Dateien erlaubt. Die Komponente lädt noch nichts hoch."
          label="Anlagen"
          multiple
          name="files"
        />
      </FormSection>

      <FormActions>
        <LinkButton to="/" variant="ghost">
          Navigation testen
        </LinkButton>
        <Button
          isDisabled={!isDirty || isSubmitting}
          onPress={() => reset(defaultValues)}
          type="button"
          variant="outline"
        >
          <RotateCcw aria-hidden="true" size={18} />
          Zurücksetzen
        </Button>
        <FormSubmitButton
          isDisabled={!isDirty}
          isSubmitting={isSubmitting}
          pendingLabel="Speichern läuft …"
        >
          <Save aria-hidden="true" size={18} />
          Beispiel speichern
        </FormSubmitButton>
      </FormActions>
    </form>
  )
}
