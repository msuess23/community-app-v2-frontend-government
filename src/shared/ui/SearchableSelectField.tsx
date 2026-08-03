import { Search, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { Button } from '@/shared/ui/Button'
import {
  SelectField,
  type SelectFieldOption,
  type SelectFieldProps,
} from '@/shared/ui/SelectField'
import { TextField } from '@/shared/ui/TextField'

export interface SearchableSelectFieldProps extends Omit<
  SelectFieldProps,
  'options'
> {
  emptySearchMessage?: ReactNode
  options: readonly SelectFieldOption[]
  searchLabel?: ReactNode
  searchPlaceholder?: string
}

/** Combines a native select with an accessible text filter for long reusable option lists. */
export function SearchableSelectField({
  disabled,
  emptySearchMessage = 'Keine passenden Einträge gefunden.',
  options,
  searchLabel = 'Auswahl durchsuchen',
  searchPlaceholder = 'Suchbegriff eingeben',
  value,
  ...selectProps
}: SearchableSelectFieldProps) {
  const [search, setSearch] = useState('')
  const normalizedSearch = normalizeSearchValue(search).toLocaleLowerCase(
    'de-DE',
  )
  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) {
      return options
    }

    const matchingOptions = options.filter((option) =>
      `${option.label} ${option.description ?? ''}`
        .toLocaleLowerCase('de-DE')
        .includes(normalizedSearch),
    )
    const selectedOption = options.find((option) => option.value === value)

    // Keep the selected value in the native select so filtering never clears a valid form value.
    if (
      selectedOption &&
      !matchingOptions.some((option) => option.value === selectedOption.value)
    ) {
      return [selectedOption, ...matchingOptions]
    }

    return matchingOptions
  }, [normalizedSearch, options, value])

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <TextField
          isDisabled={disabled}
          label={searchLabel}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          type="search"
          value={search}
        />
        <Button
          className="w-full sm:w-auto"
          isDisabled={disabled || search.length === 0}
          onPress={() => setSearch('')}
          type="button"
          variant="outline"
        >
          {search ? (
            <X aria-hidden="true" size={18} />
          ) : (
            <Search aria-hidden="true" size={18} />
          )}
          Suche zurücksetzen
        </Button>
      </div>

      {filteredOptions.length === 0 ? (
        <div
          className="border-outline-variant bg-surface-container text-on-surface-variant rounded-lg border p-4 text-sm leading-6"
          role="status"
        >
          {emptySearchMessage}
        </div>
      ) : null}

      <SelectField
        {...selectProps}
        disabled={disabled}
        options={filteredOptions}
        value={value}
      />
    </div>
  )
}

/** Normalizes human-entered option searches without changing the selected form value. */
function normalizeSearchValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}
