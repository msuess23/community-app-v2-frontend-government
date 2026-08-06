# Appointment feature

## Current frontend scope

The authority client exposes the appointment workspace only to `OFFICER` and
`MANAGER` roles through the `viewAppointmentWorkspace` capability. Slot
capacity remains additionally protected by `manageAppointmentSlots`.

The implemented appointment patches currently provide:

- `/appointments` with backend-owned search, filters, sorting and pagination,
- `/appointments/:appointmentId` with the current server projection,
- `/appointments/slots` with the office-scoped slot directory,
- `/appointments/slots/new` with accessible batch creation for 1 to 100 slots,
- server-driven reschedule, cancellation, completion and no-show actions,
- the newest-first immutable appointment event history.

Citizen and ticket filter labels come from
`/appointments/internal/filter-options`; the UI never asks users to enter
UUIDs. Embedded office, citizen and ticket references are mapped at the
feature boundary. A linked ticket becomes a navigation link only when the
backend returns `can_view=true`.

## Lifecycle commands

The detail page renders only commands contained in `allowed_actions`. It does
not reproduce the backend role, time or status matrix locally. Every command
uses its dedicated endpoint and commits only the returned appointment
projection:

- `RESCHEDULE` loads paginated future `AVAILABLE` slots of the same office,
  excludes the current slot, shows the old/new schedule and requires a reason,
- `CANCEL` requires a reason and explicitly confirms that the current slot is
  released,
- `COMPLETE` records an optional internal note after a separate confirmation,
- `MARK_NO_SHOW` records an optional internal note through its own destructive
  confirmation.

Action dialogs use the shared focus restoration and unsaved-changes guard.
Conflicts refresh appointment details, lists, event pages and slot capacity;
there are no optimistic appointment or slot states.

## Event history

Generated event DTOs are mapped to an immutable camel-case event model. Known
payloads are validated locally before rendering, so malformed event details do
not break the complete stream. Renderers cover booking, rescheduling,
cancellation, completion, no-show and document-version events. Unknown future
event types use the shared safe fallback.

The backend order is newest first. Older pages are loaded incrementally and
kept in descending sequence order. The current appointment state is never
reconstructed from this history in the frontend.

## Slot capacity

The slot directory derives an effective `EXPIRED` presentation for past
`AVAILABLE` rows without changing the backend contract. Batch creation keeps
all date-time inputs keyboard-operable, validates interval order and overlap,
and sends timezone-aware values in one bounded request. Deactivation is
confirmed and becomes visible only after server confirmation.

## Architecture

Generated snake-case DTOs end at the appointment mapper and lifecycle request
mappers. Pages and components use immutable camel-case feature models. Query
keys separately own appointment projections, event streams, filter options,
slot lists and reschedule availability.

The directory renders one information hierarchy as a semantic desktop table
and equivalent compact cards. Dialogs, feedback, confirmation, error summary,
remote-data and event-timeline behavior reuse the established shared
infrastructure.

## Deliberate boundaries

The remaining authority-client appointment work is versioned PDF document
management and the final cross-feature accessibility and test-architecture
review.

Citizen booking, `/appointments/mine`, citizen lifecycle commands and citizen
document access belong to the separate citizen client and are not registered
in this application.
