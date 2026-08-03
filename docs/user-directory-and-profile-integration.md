# User Directory and Profile Integration

## Scope

This patch introduces the first read-only user feature on top of the existing account page. It deliberately does not add administrative updates, role assignment, deactivation or audit history. Those workflows remain separate patches because they require mutation forms, conflict handling and irreversible lifecycle actions.

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

The next user patches are expected to add:

1. administrative profile editing, role assignment and office selection,
2. deactivation and append-only user history.

The current pages expose no placeholder controls for these unavailable mutations.
