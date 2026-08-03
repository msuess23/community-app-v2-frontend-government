import { useWatch, type Control } from 'react-hook-form'

import type { OfficeFormValues } from '@/features/offices/model/office-form'
import { ControlledCheckboxField } from '@/shared/forms/ControlledCheckboxField'
import { ControlledTextField } from '@/shared/forms/ControlledTextField'

/** Provides the optional postal address without exposing temporary coordinate inputs. */
export function OfficeAddressFields({
  control,
  hasExistingAddress = false,
  hasStoredCoordinates = false,
}: Readonly<{
  control: Control<OfficeFormValues>
  hasExistingAddress?: boolean
  hasStoredCoordinates?: boolean
}>) {
  const enabled = useWatch({ control, name: 'address.enabled' })

  return (
    <div className="space-y-5">
      <ControlledCheckboxField
        control={control}
        description="Aktiviere die Adressfelder, wenn die Behörde einen veröffentlichten Standort besitzt."
        label="Postadresse hinterlegen"
        name="address.enabled"
      />

      {enabled ? (
        <div className="grid gap-5 md:grid-cols-2">
          <ControlledTextField
            autoComplete="address-line1"
            control={control}
            isRequired
            label="Straße"
            maxLength={150}
            name="address.street"
          />
          <ControlledTextField
            autoComplete="address-line2"
            control={control}
            isRequired
            label="Hausnummer"
            maxLength={20}
            name="address.houseNumber"
          />
          <ControlledTextField
            autoComplete="postal-code"
            control={control}
            isRequired
            label="Postleitzahl"
            maxLength={10}
            name="address.zipCode"
          />
          <ControlledTextField
            autoComplete="address-level2"
            control={control}
            isRequired
            label="Ort"
            maxLength={100}
            name="address.city"
          />
        </div>
      ) : (
        <div
          className="border-outline-variant bg-surface-container rounded-xl border p-4"
          role="status"
        >
          <p className="font-semibold">Keine Postadresse</p>
          <p className="text-on-surface-variant mt-1 text-sm leading-6">
            {hasExistingAddress
              ? 'Beim Speichern wird die vorhandene Adresse ausdrücklich entfernt.'
              : 'Die Behörde wird ohne veröffentlichte Postadresse gespeichert.'}
          </p>
        </div>
      )}

      {hasStoredCoordinates ? (
        <p className="text-on-surface-variant text-sm leading-6">
          Vorhandene Geokoordinaten werden bei Textänderungen der Adresse
          beibehalten. Karten-, Radius- und Standortfunktionen folgen in einem
          späteren Ausbauschritt.
        </p>
      ) : (
        <p className="text-on-surface-variant text-sm leading-6">
          Geokoordinaten werden in diesem Formular noch nicht gepflegt.
        </p>
      )}
    </div>
  )
}
