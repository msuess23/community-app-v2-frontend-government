import type { ReactNode } from 'react'

/** Renders compact label/value metadata for a resource event. */
export function EventDetails({
  items,
}: Readonly<{ items: ReadonlyArray<readonly [string, ReactNode]> }>) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div className="min-w-0" key={label}>
          <dt className="text-on-surface-variant text-sm font-medium">{label}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
