/** Renders the names of ticket fields changed by an immutable event. */
export function TicketEventChangedFields({
  fields,
}: Readonly<{ fields: ReadonlyArray<readonly [string, boolean]> }>) {
  const changed = fields.filter(([, isChanged]) => isChanged)
  if (changed.length === 0) {
    return <p>Die geänderten Felder konnten nicht bestimmt werden.</p>
  }

  return (
    <p>
      Geänderte Felder: {changed.map(([label]) => label).join(', ')}
    </p>
  )
}
