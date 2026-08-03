# User Directory and Profile Integration

## Scope

This document describes the read-oriented foundation introduced by the first user patch. Administrative updates and role assignment are now documented separately in `user-administration-and-role-assignment.md`; deactivation and audit history remain a later lifecycle patch.

## Routes and capability

The `users` feature module registers:

- `/users` for the role-scoped directory,
- `/users/:userId` for one backend-authorized user profile.

Both routes and the primary navigation entry inherit the `viewUsers` capability. Backend object authorization remains authoritative when a detail URL is opened directly.

## Role-scoped directory

The directory maps URL state to the backend list contract:

- `search` searches first name, last name and email,
- `role` filters by one role available to the caller,
- `office` is available to dispatchers and administrators,
- `status` is available only to administrators,
- sorting and pagination remain shareable URL parameters.

The frontend does not send filters that are outside the caller's backend scope. Officers and managers therefore receive their forced office scope from the backend without an editable office filter. Non-admin roles cannot request citizen or inactive accounts.

## Responsive information hierarchy

The directory uses the shared data-view components but selects a feature-appropriate breakpoint:

- smartphones receive one full-width card per account,
- tablets receive a two-column card grid with the same information and actions,
- desktop viewports receive a semantic sortable table.

The compact and table representations are rendered from the same column definition so neither device class loses data or actions. Search, filters, pagination and empty/error states remain keyboard and screen-reader accessible.

## Office references

User DTOs contain only `office_id`. Shared office-reference queries resolve this identifier to a readable name:

- list filters load every office visible to the current caller in bounded API pages,
- directory rows reuse the already loaded office directory when possible,
- detail and account summaries fall back to a deduplicated office-detail query,
- failed references show a safe textual fallback instead of presenting the UUID as the primary label.

The account page now uses the same office reference instead of displaying the raw identifier.

## API boundary

Generated Orval DTOs remain inside the query boundary. The feature maps `UserResponse` and the paginated response into camel-case `UserRecord` and `PageModel<UserRecord>` values before they reach components.

Query keys are owned by the user feature. List changes retain previous data while the next server page loads, and all requests receive TanStack Query's abort signal.

## Follow-up patches

Administrative profile editing, role assignment and office selection are provided by the second user patch. Deactivation and append-only user history remain the final user lifecycle patch.
