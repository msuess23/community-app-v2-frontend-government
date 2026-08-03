import { Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldPath,
} from 'react-hook-form'

import type { OfficeFormValues } from '@/features/offices/model/office-form'
import {
  OFFICE_WEEKDAYS,
  type OfficeWeekday,
} from '@/features/offices/model/office-model'
import { ControlledSelectField } from '@/shared/forms/ControlledSelectField'
import { ControlledTextField } from '@/shared/forms/ControlledTextField'
import { Button } from '@/shared/ui/Button'

const DAY_MODE_OPTIONS = [
  { label: 'Nicht angegeben', value: 'unspecified' },
  { label: 'Geschlossen', value: 'closed' },
  { label: 'Mit Öffnungszeiten', value: 'open' },
] as const

/** Edits all seven weekdays without exposing the backend's comma-separated syntax. */
export function OfficeOpeningHoursEditor({
  control,
}: Readonly<{ control: Control<OfficeFormValues> }>) {
  return (
    <div className="grid gap-4">
      {OFFICE_WEEKDAYS.map((weekday) => (
        <OfficeOpeningDayEditor
          control={control}
          key={weekday.key}
          label={weekday.label}
          weekday={weekday.key}
        />
      ))}
    </div>
  )
}

interface OfficeOpeningDayEditorProps {
  control: Control<OfficeFormValues>
  label: string
  weekday: OfficeWeekday
}

/** Owns one weekday's mode and dynamic, structured time intervals. */
function OfficeOpeningDayEditor({
  control,
  label,
  weekday,
}: OfficeOpeningDayEditorProps) {
  const name = `openingHours.${weekday}.intervals` as const
  const { append, fields, remove } = useFieldArray({ control, name })
  const mode = useWatch({
    control,
    name: `openingHours.${weekday}.mode`,
  })

  useEffect(() => {
    if (mode === 'open' && fields.length === 0) {
      append({ end: '', start: '' }, { shouldFocus: false })
    }
  }, [append, fields.length, mode])

  return (
    <fieldset className="border-outline-variant rounded-xl border p-4 sm:p-5">
      <legend className="px-1 text-lg font-semibold">{label}</legend>
      <div className="grid gap-5 pt-2 lg:grid-cols-[minmax(13rem,0.7fr)_minmax(0,1.3fr)] lg:items-start">
        <ControlledSelectField
          control={control}
          label={`Status am ${label}`}
          name={`openingHours.${weekday}.mode`}
          options={DAY_MODE_OPTIONS}
        />

        {mode === 'open' ? (
          <div className="space-y-4">
            <ol aria-label={`Zeitintervalle am ${label}`} className="grid gap-3">
              {fields.map((field, index) => (
                <li
                  className="bg-surface-container-low grid gap-3 rounded-xl p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start"
                  key={field.id}
                >
                  <ControlledTextField
                    control={control}
                    label={`Startzeit, Intervall ${index + 1}`}
                    name={
                      `openingHours.${weekday}.intervals.${index}.start` as FieldPath<
                        OfficeFormValues
                      >
                    }
                    type="time"
                  />
                  <ControlledTextField
                    control={control}
                    label={`Endzeit, Intervall ${index + 1}`}
                    name={
                      `openingHours.${weekday}.intervals.${index}.end` as FieldPath<
                        OfficeFormValues
                      >
                    }
                    type="time"
                  />
                  <Button
                    aria-label={`Zeitintervall ${index + 1} am ${label} entfernen`}
                    className="sm:mt-7"
                    isDisabled={fields.length === 1}
                    onPress={() => remove(index)}
                    type="button"
                    variant="outline"
                  >
                    <Trash2 aria-hidden="true" size={18} />
                    <span className="sm:sr-only">Intervall entfernen</span>
                  </Button>
                </li>
              ))}
            </ol>

            <Button
              onPress={() =>
                append({ end: '', start: '' }, { shouldFocus: true })
              }
              type="button"
              variant="secondary"
            >
              <Plus aria-hidden="true" size={18} />
              Zeitintervall hinzufügen
            </Button>
          </div>
        ) : (
          <p className="text-on-surface-variant self-center text-sm leading-6">
            {mode === 'closed'
              ? `${label} wird ausdrücklich als geschlossen veröffentlicht.`
              : `Für ${label} werden keine Öffnungszeiten veröffentlicht.`}
          </p>
        )}
      </div>
    </fieldset>
  )
}
