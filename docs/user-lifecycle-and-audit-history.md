# User Lifecycle and Audit History

This increment completes the authority-facing user feature with irreversible lifecycle actions and append-only audit visibility.

## Routes

- `/users/:userId` exposes capability-gated lifecycle actions.
- `/users/:userId/history` exposes the administrator-only audit history.

Both routes preserve the original user-directory URL so search, filters, sorting, and pagination survive round trips through profile, edit, and history views.

## Deactivation workflow

Only administrators can deactivate another active account. The current administrator account is intentionally excluded in the UI, while the backend remains the authoritative safeguard.

The modal workflow:

1. explains role-specific consequences,
2. requires an audit reason,
3. submits the generated `UserDeactivateRequest`,
4. reloads the user because the DELETE endpoint returns `204 No Content`,
5. commits only that server-confirmed projection to the detail cache,
6. invalidates directory and history queries.

Citizen accounts are described separately because the backend immediately anonymizes their name and email address. Active ticket dependencies and scheduled citizen appointments are translated into task-specific conflict messages.

There is no reactivation action because the backend does not expose one.

## Audit history

The history page treats every item as an immutable snapshot of the account after an administrative change. It does not present the records as event-sourcing events or as a previous-state diff.

The page provides:

- inclusive calendar-day filters,
- timezone-aware query values for `Europe/Berlin`,
- server-side pagination,
- desktop tables,
- tablet card grids,
- single-column smartphone cards,
- readable office and actor references with safe technical fallbacks.

The backend returns `changed_by_user_id` rather than an embedded actor projection. The frontend therefore resolves actor names through the existing user-detail query and relies on TanStack Query to deduplicate repeated IDs.

## Shared additions

- `DataViewFilterDateField` is a reusable native date filter for later ticket, info, and appointment lists.
- `toZonedDayBoundaryIso` converts calendar days into timezone-aware inclusive boundaries without relying on the browser's current timezone.
- `ResourceDetailBackLink` now accepts route state so nested resource pages can preserve their originating list URL.

## Deliberate exclusions

This patch does not add:

- account reactivation,
- physical deletion,
- bulk lifecycle actions,
- user export,
- editable email addresses,
- administrator password assignment.
