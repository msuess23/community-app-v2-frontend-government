# Office Creation and Editing

## Scope

This document describes the administrator-only office master-data workflows introduced by the second office frontend patch. It builds on the directory, full office model, detail query and responsive detail page from the first patch.

The patch adds:

- `/offices/new` for creation,
- `/offices/:officeId/edit` for editing active offices,
- directory and detail actions guarded by `manageOffices`,
- structured service, opening-hour and address editing,
- normalized create and minimal partial-update mappings,
- server-confirmed cache synchronization.

Deactivation and immutable history remain part of the third office patch.

## Shared form workflow

Creation and editing use the same `OfficeForm`. The form follows the existing administrative patterns:

- React Hook Form owns one explicit edit session,
- Zod mirrors backend limits and cross-field rules,
- `FormFieldScope` provides stable field identifiers,
- `FormErrorSummary` receives client and submission failures,
- `useUnsavedChangesGuard` protects browser and in-app navigation,
- sticky `FormActions` remain reachable on long smartphone forms,
- mutations do not use optimistic updates.

The layout changes by available width. Basic and contact data form two desktop columns, while every section remains linear on narrow screens. Dynamic rows use large shared buttons, explicit labels and no pointer-only behavior.

## Services

Services are edited as a dynamic ordered list rather than a delimited text value. Administrators can add and remove entries with the keyboard. Validation enforces:

- at most 50 entries,
- at most 100 characters per entry,
- no empty entries,
- no case-insensitive duplicates.

The request mapper normalizes whitespace and preserves the configured order. Removing every item sends `[]`, matching the backend's non-null collection contract.

## Opening hours

The editor provides one named fieldset for every weekday. Each day has three explicit states:

- not specified,
- closed,
- one or more opening intervals.

Intervals use separate native time inputs. Client validation requires valid times, start before end and non-overlapping intervals. The API mapper sorts intervals chronologically and creates normalized values such as `08:00-12:00, 13:00-16:00` only at the transport boundary.

The backend replaces the complete opening-hours object during `PATCH`. Therefore the frontend compares and sends the whole normalized weekly projection when any day changes. Clearing every day sends `null` and produces the backend's empty opening-hours state.

## Address and deferred geographic UI

The optional postal address contains street, house number, postal code and city. Enabling an address requires all four values. Editing distinguishes:

- no address change,
- adding one complete address,
- changing only selected fields of an existing address,
- explicitly removing an existing address with `null`.

Latitude and longitude are deliberately not editable. No browser geolocation, radius control, bounding-box input, map dependency or geocoding service is introduced. Existing coordinates are preserved because updates to an existing address omit coordinate properties rather than sending `null`.

A later map feature can add location and radius behavior without changing the current postal-address contract.

## Partial update semantics

`OfficeCreate` always receives one complete normalized creation projection. `OfficeUpdate` is built from the persisted `OfficeRecord` and validated form values.

The update mapper distinguishes:

- unchanged fields: property omitted,
- cleared optional text: `null`,
- cleared services: `[]`,
- cleared opening hours: `null`,
- removed address: `null`,
- changed existing address: only changed address fields,
- newly added address: all required postal fields.

The mandatory edit reason is normalized separately and does not count as a master-data change. This prevents history entries caused solely by entering a reason without changing office data.

## Lifecycle and cache behavior

Deactivated offices show a dedicated non-editable state even when an administrator opens an old edit URL. The backend remains authoritative and may also return `OFFICE_INACTIVE` during a concurrent update.

After creation or editing, the mutation result is mapped through the same DTO boundary as read queries. The frontend then:

- commits the returned office to the full detail cache,
- invalidates full office lists,
- invalidates the small shared office-reference cache,
- navigates only after the confirmed response is available.

No client-generated office record or optimistic mutation is used.

## Error mapping

The form maps standard validation locations, nested address fields, service indices and weekday errors to the closest actionable control. Domain failures receive German form-level messages, including:

- `INCOMPLETE_ADDRESS`,
- `OFFICE_INACTIVE`,
- `OFFICE_NOT_FOUND`,
- authorization and network failures.

Server validation remains the final source of truth. Client validation exists to make errors understandable before submission, not to replace backend rules.
