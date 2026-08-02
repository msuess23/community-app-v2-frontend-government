import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'

export interface DataViewFilterPanelProps {
  activeFilterCount?: number
  children: ReactNode
  className?: string
  onReset?: () => void
  title?: string
}

/** Groups list filters in a responsive panel that remains keyboard accessible. */
export function DataViewFilterPanel({
  activeFilterCount = 0,
  children,
  className,
  onReset,
  title = 'Filter',
}: DataViewFilterPanelProps) {
  const panelId = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const triggerLabel =
    activeFilterCount === 0
      ? title
      : `${title}: ${activeFilterCount} ${
          activeFilterCount === 1 ? 'aktiver Filter' : 'aktive Filter'
        }`

  /** Closes the compact filter panel and returns focus to its trigger. */
  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !isOpen) {
      return
    }

    event.preventDefault()
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className={cn('space-y-3', className)}>
      <Button
        aria-controls={panelId}
        aria-label={triggerLabel}
        aria-expanded={isOpen}
        className="w-full justify-between md:hidden"
        onPress={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
        variant="outline"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal aria-hidden="true" size={18} />
          {title}
          {activeFilterCount > 0 ? (
            <span className="bg-primary text-on-primary rounded-full px-2 py-0.5 text-xs">
              {activeFilterCount}
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn('transition-transform', isOpen && 'rotate-180')}
          size={18}
        />
      </Button>

      <Card
        className={cn(!isOpen && 'hidden md:block')}
        id={panelId}
        onKeyDown={handlePanelKeyDown}
        padding="sm"
        variant="subtle"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          {onReset && activeFilterCount > 0 ? (
            <Button onPress={onReset} size="sm" type="button" variant="ghost">
              Alle zurücksetzen
            </Button>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      </Card>
    </div>
  )
}

export type DataViewFilterOption = Readonly<{
  label: string
  value: string
}>

export interface DataViewFilterSelectProps {
  allLabel?: string
  className?: string
  label: string
  onChange: (value: string) => void
  options: readonly DataViewFilterOption[]
  value: string
}

/** Renders a compact native select for URL-backed list filters. */
export function DataViewFilterSelect({
  allLabel = 'Alle',
  className,
  label,
  onChange,
  options,
  value,
}: DataViewFilterSelectProps) {
  const selectId = useId()

  /** Sends the native select value back to the feature-owned URL state. */
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.currentTarget.value)
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <label
        className="text-on-surface text-sm font-semibold"
        htmlFor={selectId}
      >
        {label}
      </label>
      <select
        className="border-outline bg-surface text-on-surface hover:border-secondary focus-visible:border-primary focus-visible:ring-primary min-h-11 w-full rounded-lg border px-3 py-2.5 text-base shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        id={selectId}
        onChange={handleChange}
        value={value}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export type ActiveDataViewFilter = Readonly<{
  key: string
  label: string
  onRemove: () => void
}>

/** Displays removable active filters without relying on color alone. */
export function ActiveDataViewFilters({
  filters,
  label = 'Aktive Filter',
}: Readonly<{
  filters: readonly ActiveDataViewFilter[]
  label?: string
}>) {
  if (filters.length === 0) {
    return null
  }

  return (
    <div
      aria-label={label}
      className="flex flex-wrap items-center gap-2"
      role="group"
    >
      <span className="text-on-surface-variant text-sm font-semibold">
        {label}:
      </span>
      {filters.map((filter) => (
        <span
          className="border-outline-variant bg-surface inline-flex min-h-10 items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-sm"
          key={filter.key}
        >
          {filter.label}
          <Button
            aria-label={`Filter „${filter.label}“ entfernen`}
            className="min-h-8 rounded-full px-2"
            onPress={filter.onRemove}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" size={16} />
          </Button>
        </span>
      ))}
    </div>
  )
}
