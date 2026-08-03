import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useWatch, type Control } from 'react-hook-form'

import type { OfficeFormValues } from '@/features/offices/model/office-form'
import { ControlledTextField } from '@/shared/forms/ControlledTextField'
import { Button } from '@/shared/ui/Button'

const MAX_SERVICES = 50

/** Provides a keyboard-accessible dynamic list for the office service collection. */
export function OfficeServicesField({
  control,
}: Readonly<{ control: Control<OfficeFormValues> }>) {
  const { append, fields, remove } = useFieldArray({
    control,
    name: 'services',
  })
  const values = useWatch({ control, name: 'services' })

  return (
    <div className="space-y-5">
      {fields.length === 0 ? (
        <p className="text-on-surface-variant rounded-xl border border-dashed border-outline-variant p-4 text-sm leading-6">
          Noch keine Leistungen hinterlegt. Eine Behörde kann auch ohne
          Leistungsliste gespeichert werden.
        </p>
      ) : (
        <ol aria-label="Angebotene Leistungen" className="grid gap-4">
          {fields.map((field, index) => {
            const currentValue = values[index]?.value.trim()
            const label = `Leistung ${index + 1}`

            return (
              <li
                className="border-outline-variant bg-surface-container-low grid gap-3 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                key={field.id}
              >
                <ControlledTextField
                  control={control}
                  label={label}
                  maxLength={100}
                  name={`services.${index}.value`}
                  placeholder="Zum Beispiel Personalausweise"
                />
                <Button
                  aria-label={`${currentValue || label} entfernen`}
                  className="sm:mt-7"
                  onPress={() => remove(index)}
                  type="button"
                  variant="outline"
                >
                  <Trash2 aria-hidden="true" size={18} />
                  <span className="sm:sr-only">Entfernen</span>
                </Button>
              </li>
            )
          })}
        </ol>
      )}

      <Button
        isDisabled={fields.length >= MAX_SERVICES}
        onPress={() => append({ value: '' }, { shouldFocus: true })}
        type="button"
        variant="secondary"
      >
        <Plus aria-hidden="true" size={18} />
        Leistung hinzufügen
      </Button>
      <p className="text-on-surface-variant text-sm leading-5">
        {fields.length} von maximal {MAX_SERVICES} Leistungen
      </p>
    </div>
  )
}
