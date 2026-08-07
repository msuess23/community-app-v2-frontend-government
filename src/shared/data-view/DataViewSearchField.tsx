import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Search, X } from 'lucide-react'

import { DEFAULT_DATA_VIEW_SEARCH_MAX_LENGTH } from '@/shared/data-view/data-view-url-state'
import { Button } from '@/shared/ui/Button'

export interface DataViewSearchFieldProps {
  debounceMs?: number
  description?: string
  label?: string
  maxLength?: number
  onSearch: (value: string) => void
  placeholder?: string
  value: string
}

type SearchDraftState = Readonly<{
  committedValue: string
  draft: string
  externalValue: string
}>

/** Provides a labelled, debounced search control for server-backed list views. */
export function DataViewSearchField({
  debounceMs = 400,
  description = 'Die Suche wird nach einer kurzen Eingabepause ausgeführt.',
  label = 'Suche',
  maxLength = DEFAULT_DATA_VIEW_SEARCH_MAX_LENGTH,
  onSearch,
  placeholder = 'Einträge durchsuchen',
  value,
}: DataViewSearchFieldProps) {
  const descriptionId = useId()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const [searchState, setSearchState] = useState<SearchDraftState>(() => ({
    committedValue: normalizeSearch(value, maxLength),
    draft: normalizeSearch(value, maxLength),
    externalValue: value,
  }))

  if (searchState.externalValue !== value) {
    const normalizedExternalValue = normalizeSearch(value, maxLength)
    const draftAlreadyRepresentsValue =
      normalizeSearch(searchState.draft, maxLength) === normalizedExternalValue

    setSearchState({
      committedValue: normalizedExternalValue,
      draft: draftAlreadyRepresentsValue
        ? searchState.draft
        : normalizedExternalValue,
      externalValue: value,
    })
  }

  const draft = searchState.draft

  /** Cancels a pending debounced server-search update. */
  const clearPendingCommit = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  /** Commits a normalized search immediately when the user submits. */
  const commitSearch = useCallback(
    (nextValue: string) => {
      clearPendingCommit()
      const normalizedValue = normalizeSearch(nextValue, maxLength)

      if (normalizedValue === searchState.committedValue) {
        return
      }

      setSearchState((current) => ({
        ...current,
        committedValue: normalizedValue,
      }))
      onSearch(normalizedValue)
    },
    [clearPendingCommit, maxLength, onSearch, searchState.committedValue],
  )

  useEffect(() => {
    const normalizedDraft = normalizeSearch(draft, maxLength)

    if (normalizedDraft === searchState.committedValue) {
      return undefined
    }

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null
      setSearchState((current) => ({
        ...current,
        committedValue: normalizedDraft,
      }))
      onSearch(normalizedDraft)
    }, debounceMs)

    return clearPendingCommit
  }, [
    clearPendingCommit,
    debounceMs,
    draft,
    maxLength,
    onSearch,
    searchState.committedValue,
  ])

  /** Prevents native navigation and commits the current draft immediately. */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    commitSearch(draft)
  }

  /** Updates only the local draft while the server-backed value catches up. */
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextDraft = event.currentTarget.value
    setSearchState((current) => ({ ...current, draft: nextDraft }))
  }

  /** Clears the query and keeps keyboard focus in the search input. */
  const handleClear = () => {
    setSearchState((current) => ({ ...current, draft: '' }))
    commitSearch('')
    inputRef.current?.focus()
  }

  return (
    <form className="grid gap-2" onSubmit={handleSubmit} role="search">
      <label
        className="text-on-surface text-sm font-semibold"
        htmlFor={inputId}
      >
        {label}
      </label>
      <div className="flex min-w-0 gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            size={18}
          />
          <input
            aria-describedby={descriptionId}
            className="border-outline bg-surface text-on-surface placeholder:text-on-surface-variant hover:border-secondary focus-visible:border-primary focus-visible:ring-primary min-h-11 w-full rounded-lg border py-2.5 pr-11 pl-10 text-base shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            id={inputId}
            maxLength={maxLength}
            onChange={handleChange}
            placeholder={placeholder}
            ref={inputRef}
            type="search"
            value={draft}
          />
          {draft.length > 0 ? (
            <Button
              aria-label="Sucheingabe löschen"
              className="absolute top-1/2 right-1 min-h-9 -translate-y-1/2 px-2"
              onPress={handleClear}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" size={18} />
            </Button>
          ) : null}
        </div>
        <Button className="shrink-0" type="submit" variant="outline">
          <Search aria-hidden="true" size={18} />
          <span className="hidden sm:inline">Suchen</span>
        </Button>
      </div>
      <p className="text-on-surface-variant text-sm" id={descriptionId}>
        {description}
      </p>
    </form>
  )
}

/** Normalizes user input before it becomes server query state. */
function normalizeSearch(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength)
}
