# Office Directory and Detail Integration

## Scope

This document describes the read-oriented office foundation introduced by the first office patch. Office creation and editing remain a second patch; deactivation and immutable audit history remain a third lifecycle patch.

Geographic filtering is intentionally not exposed yet. The generated API still supports `bbox`, but the frontend does not provide coordinate inputs, browser geolocation, radius selection, a map library or a map-based result view. Those concerns can later be added as one coherent extension without coupling the current directory to a temporary manual-coordinate workflow.

## Routes and capability

The `offices` feature module registers:

- `/offices` for the role-scoped directory,
- `/offices/:officeId` for one backend-authorized office detail view.

Both routes and the primary navigation entry inherit the `viewOffices` capability. Dispatchers, officers, managers and administrators receive that capability. The existing `manageOffices` capability remains administrator-only and is not used by this read patch.

Although the backend permits anonymous reads of active offices, the authority frontend keeps both routes inside the authenticated application shell. Backend object and lifecycle authorization remains authoritative when a detail URL is opened directly.

## Role-scoped directory

The directory maps shareable URL state to the generated backend list contract:

- `search` searches name, description and contact email,
- `status` is available only to administrators,
- sorting supports name, contact email and creation date,
- pagination and page size remain URL-controlled.

Non-admin roles always send the active lifecycle scope, even when a manually entered URL contains an inactive status parameter. Administrators default to active offices but may request inactive or combined results.

The feature does not send `bbox`. Query and mapping ownership remains isolated so later geographic state can be added without changing the shared data-view foundation.

## Responsive information hierarchy

The directory uses the existing shared data-view components with a feature-appropriate breakpoint:

- smartphones receive one full-width card per office,
- tablets receive a two-column card grid,
- desktop viewports receive a semantic sortable table.

Name, place and contact data remain visible together because office names are not unique. Service lists are summarized in the directory but fully available on the detail page. The compact and desktop representations are generated from the same column definition so neither representation loses status, creation date or actions.

Search, lifecycle filters, active-filter removal, sorting, pagination and result actions remain keyboard accessible. Status badges always include explicit text, table rows use the office name as their semantic row header, and each compact article receives a name qualified by place or contact data.

## Detail view

The office detail view presents:

- the complete description,
- mail and telephone actions,
- every configured service,
- a seven-day opening-hours overview,
- the postal address,
- optional latitude and longitude as technical metadata only,
- active state, creation time, deactivation time and office identifier.

On desktop, description, services and opening hours form the main content while contact, address and lifecycle metadata use a sticky sidebar. On smaller devices all sections remain in one linear document order. Section navigation uses ordinary anchors and all information remains available without hover or pointer-only interaction.

Opening-hour values are not shown as one opaque backend string. Every weekday has an explicit label; missing values read as “Nicht angegeben”, closed days read as “Geschlossen”, and valid intervals are rendered as readable time ranges.

## API boundary and query ownership

Generated Orval DTOs stay inside the query boundary. The office feature maps nested addresses, lifecycle metadata and optional weekday values into a complete camel-case `OfficeRecord` before components consume them.

The full feature queries use their own `office-feature` query-key root. The pre-existing `shared/offices` layer continues to own small `OfficeReference` values used by user and account features. Keeping the two data shapes under different keys prevents one query from populating another consumer with an incompatible cached model.

List changes retain the previous page while the next server request is loading, and every generated request receives TanStack Query's abort signal.

## Follow-up patches

The second office patch will add administrator-only creation and editing with structured services, opening hours and address handling. The third patch will add deactivation, dependency-conflict presentation and immutable office history.
