# Office deactivation and audit history

The third office frontend increment completes the administrative lifecycle without introducing reactivation or geographic map behavior.

## Routes and access

- `/offices/:officeId/history` is registered below the existing `manageOffices` capability guard.
- Every authenticated authority role may still read active office details through `viewOffices`.
- Only administrators see edit, history, and deactivation actions.
- Deactivated offices keep the history action but no longer expose edit or deactivation controls.

## Deactivation workflow

The detail page opens the shared resource-action dialog instead of mixing destructive lifecycle behavior into the edit form. The dialog:

- identifies the selected office with a location or contact qualifier when available,
- explains that deactivation is irreversible,
- explains the effects on lists, assignments, and editing,
- requires the shared audited change-reason field,
- protects dirty input when the dialog is dismissed,
- uses the destructive shared submit treatment.

The generated `DELETE /api/v1/offices/{officeId}` client returns no entity. After a successful `204`, the mutation reloads the office through `GET /api/v1/offices/{officeId}` and commits only that server-confirmed projection. Full office lists, reference-oriented office queries, and office-history queries are invalidated afterwards.

The frontend translates the backend lifecycle conflicts without estimating dependency counts:

- `OFFICE_HAS_ACTIVE_USERS` links to `/users?office=<officeId>&status=active`,
- `OFFICE_HAS_ACTIVE_TICKETS` explains that active concerns must be closed or transferred,
- `OFFICE_HAS_APPOINTMENT_COMMITMENTS` explains that appointment commitments must be resolved,
- `OFFICE_ALREADY_DEACTIVATED` reports the concurrent lifecycle change.

Ticket and appointment links are deliberately omitted until those feature areas provide stable filtered routes.

## Immutable history model

History DTOs cross a dedicated feature boundary. Each page is presented newest first before moving further into the past. The mapper:

- preserves the history-row and office identifiers,
- normalizes optional contact and descriptive values,
- completes every weekday in the weakly generated opening-hours object,
- copies `address_snapshot` directly into a historical address model,
- never resolves a historical address through the current office record.

The URL owns optional `startDate`, `endDate`, page, and page-size state. Calendar days are converted to inclusive `Europe/Berlin` boundaries before the generated history client is called. Invalid ranges are rejected before any request is sent.

## Responsive and accessible presentation

- Smartphone snapshots use one-column cards and native disclosure semantics.
- Tablet layouts use a two-column card grid where space permits.
- Desktop uses a compact semantic summary table with a keyboard-operable disclosure button and a full-width detail row.
- Snapshot details are grouped into basic data, contact, services, historical address, opening hours, and audit metadata.
- Status always includes text, not color alone.
- Email and phone values remain actionable links.
- Opening hours reuse the existing weekday-oriented, screen-reader-friendly view.
- Audit actors reuse `UserReferenceName` with its technical fallback.
- Existing coordinates are shown only as technical snapshot values; no map, radius, location request, or bounding-box UI is introduced.
