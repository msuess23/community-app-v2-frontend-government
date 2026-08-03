import {
  DataViewFilterDateField,
  DataViewFilterPanel,
} from '@/shared/data-view/DataViewFilters'

export interface UserHistoryFiltersProps {
  endDate: string
  onReset: () => void
  onSetEndDate: (value: string) => void
  onSetStartDate: (value: string) => void
  startDate: string
}

/** Renders the inclusive calendar-day range used by the audit-history endpoint. */
export function UserHistoryFilters({
  endDate,
  onReset,
  onSetEndDate,
  onSetStartDate,
  startDate,
}: UserHistoryFiltersProps) {
  const activeFilterCount = Number(Boolean(startDate)) + Number(Boolean(endDate))

  return (
    <DataViewFilterPanel
      activeFilterCount={activeFilterCount}
      onReset={onReset}
      title="Zeitraum"
    >
      <DataViewFilterDateField
        description="Berücksichtigt den vollständigen Kalendertag in der Zeitzone Europe/Berlin."
        label="Von"
        max={endDate || undefined}
        onChange={onSetStartDate}
        value={startDate}
      />
      <DataViewFilterDateField
        description="Der gewählte Endtag wird einschließlich 23:59 Uhr berücksichtigt."
        label="Bis"
        min={startDate || undefined}
        onChange={onSetEndDate}
        value={endDate}
      />
    </DataViewFilterPanel>
  )
}
