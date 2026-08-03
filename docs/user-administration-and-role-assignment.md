# User Administration and Role Assignment

## Scope

This patch adds the administrator-only edit workflow on top of the read-only user directory. It covers profile names, role assignment, office assignment, audit reasons, backend conflict mapping and cache synchronization. Deactivation and append-only audit history remain the next user patch because they are lifecycle operations with separate confirmation and presentation needs.

## Route and capability

The user feature registers `/users/:userId/edit` beneath an additional `manageUsers` guard. The directory and detail pages remain available through `viewUsers`, while only administrators can reach the mutation route or see its action.

The edit page keeps the directory return URL in router state. Successful saves and explicit cancellation return to the user detail page without losing the filters, sorting or pagination from which the administrator started.

## Role and office rules

The form mirrors the backend's resulting-state validation:

- existing authority accounts cannot become citizens again,
- an administrator cannot remove their own admin role,
- officers and managers require an active office,
- dispatchers may have an office,
- citizen and admin accounts cannot retain an office,
- deactivated accounts are shown as read-only because no reactivation endpoint exists.

The backend remains authoritative. Client validation prevents avoidable submissions, while stable backend error codes are translated to the affected role or office field whenever possible.

## Searchable office selection

`SearchableSelectField` combines a visible text filter with a native select. This deliberately preserves the predictable keyboard, touch and assistive-technology behavior of the platform select while making long option lists easier to navigate.

The selected value remains available even when it does not match the current search. The form control also remains mounted when no option matches, so labels, errors and React Hook Form focus references stay valid.

`ControlledOfficeSelectionField` loads active offices through the shared office query boundary. A currently assigned inactive office may be displayed as a disabled legacy option, but the administrator must choose an active office before submitting a role that requires one.

## Mutation lifecycle

The generated Orval function performs the transport request. The feature maps the returned DTO immediately into `UserRecord`, then:

1. cancels an older detail request,
2. stores the confirmed server response in the detail cache,
3. invalidates all user-directory list projections,
4. refreshes `/users/me` when the administrator edited their own account,
5. shows success feedback and returns to the detail page.

The feature does not apply optimistic role or office updates.

## Audit reason

Every administrative update requires a normalized change reason between three and 500 characters. The UI explains that this value is stored permanently in the user history. The next patch will expose that history and the separate deactivation workflow.

## Responsive behavior

- Smartphones use one vertical form flow and a sticky full-width action area.
- Tablets place first and last name side by side while keeping role and office controls readable.
- Desktop viewports show editable profile data beside immutable account references and place role and office controls in two columns.

All controls have visible labels, descriptions, error associations and keyboard-accessible actions. Unsaved changes are protected for internal navigation and browser unloads.
