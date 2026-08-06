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
- the newest-first immutable appointment event history,
- current versioned PDF document groups, retained version histories and authenticated downloads,
- guarded uploads for new document groups and immutable replacement versions.

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

## Versioned documents

The appointment detail page loads the current version of every document group
and shows document type, original filename, size, upload time, current version
number and citizen visibility. Each group exposes its retained versions newest
first. Historical versions remain downloadable; the UI deliberately provides
no edit or delete actions.

Uploads accept exactly one non-empty PDF up to 10 MiB. Staff may create a new
document group or append a replacement version. Replacement mode derives and
locks the existing document type because all versions represent the same
logical document. The citizen-visibility choice is explicit and accompanied by
a visible internal/public explanation. Selected files participate in the
shared unsaved-changes guard.

Downloads use the authenticated API client with a binary response, create a
temporary object URL using the original filename and revoke that URL after the
browser download starts. Upload success invalidates current documents, all
version lists, the appointment projection and the immutable event stream; no
optimistic document or appointment state is created.

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

Citizen booking, `/appointments/mine`, citizen lifecycle commands and citizen
document access belong to the separate citizen client and are not registered
in this application.

## Final quality review

The authority-client contract is now connected end to end:

| Backend operation | Frontend surface |
| --- | --- |
| internal appointment list and filter options | URL-owned appointment directory |
| appointment detail projection | appointment detail workspace |
| reschedule, cancel, complete and no-show | `allowed_actions`-driven dialogs |
| newest-first event stream | incrementally loaded event timeline |
| office slot list, batch creation and deactivation | slot-capacity workspace |
| current documents, immutable versions, upload and content | document section and authenticated PDF download |

The frontend deliberately does not call citizen booking, `/appointments/mine`,
citizen lifecycle or citizen document endpoints.

Officer and Manager roles receive the appointment workspace, slot capacity and
document management capabilities. Dispatcher and Administrator roles are
verified as denied both in the capability matrix and browser routing tests.
The UI never expands the backend permission matrix locally: lifecycle buttons
continue to come exclusively from `allowed_actions`.

### Accessibility and responsive verification

The final appointment scenarios cover semantic desktop tables and equivalent
compact cards, named regions and landmarks, textual statuses, machine-readable
`time` values, keyboard-operable dynamic slot rows, focused error summaries,
dialog focus restoration, guarded dirty forms and polite atomic mutation
status. Document visibility and selected reschedule times are announced without
relying on color.

Playwright runs the appointment workflows in desktop, tablet and smartphone
projects with Axe checks. A dedicated 320 CSS-pixel reflow scenario verifies
that the detail workspace, lifecycle controls, document management and local
section navigation do not create horizontal page scrolling; interactive
controls retain at least a 44 CSS-pixel target height. The same scenario also
checks a short landscape viewport. Manual review at 200 and 400 percent browser
zoom remains part of the study handover checklist because browser zoom behavior
cannot be represented reliably by viewport emulation alone.

### Test architecture

Appointment browser tests use only reusable feature fixtures and page objects:

```text
tests/e2e/
├── fixtures/
│   ├── appointment-api-data.ts
│   └── appointment-api.ts
├── pages/
│   └── appointment-pages.ts
└── appointments.spec.ts
```

The mutable API fixture records lifecycle, slot, upload, download and pagination
requests while updating only server-returned projections. It supports scheduled
and begun appointments, all four lifecycle outcomes, paginated history and a
future unknown event type. Unit tests continue to own mapper, URL-state,
validation, request-contract, renderer and query-cache behavior; E2E tests own
role routing, responsive composition and complete user workflows.
