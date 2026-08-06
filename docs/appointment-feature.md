# Appointment feature

## Current frontend scope

The authority client exposes the appointment workspace only to `OFFICER` and
`MANAGER` roles through the `viewAppointmentWorkspace` capability.

Patch 1 implements the read model:

- `/appointments` lists appointments from the backend-scoped internal endpoint.
- `/appointments/:appointmentId` renders the current server projection.
- Search, status, citizen, linked-ticket, appointment-date and creation-date
  filters remain URL-owned and are sent to the backend.
- Citizen and ticket filter labels come from
  `/appointments/internal/filter-options`; the UI never asks users to enter
  UUIDs.
- Embedded office, citizen and ticket references are mapped at the feature
  boundary. A linked ticket becomes a navigation link only when the backend
  returns `can_view=true`.
- `allowed_actions` is preserved in the frontend read model for the later
  lifecycle patch, but Patch 1 deliberately renders no appointment commands.

## Architecture

Generated snake-case DTOs end at `model/appointment-mapper.ts`. Pages and
components use an immutable camel-case `AppointmentRecord`. TanStack Query keys
are owned by the feature and list state is encoded through the shared data-view
URL infrastructure.

The directory renders one information hierarchy as a semantic desktop table
and equivalent compact cards. The detail page reads the current projection
directly and does not derive state from the event stream.

## Deliberate boundaries

The following backend operations belong to later authority-client patches:

- appointment-slot capacity management,
- reschedule, cancellation, completion and no-show commands,
- event history,
- versioned PDF documents.

Citizen booking, `/appointments/mine`, citizen lifecycle commands and citizen
document access belong to the separate citizen client and are not registered
in this application.
