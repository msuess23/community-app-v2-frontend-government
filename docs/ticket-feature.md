# Ticket feature

The authority client implements the internal ticket workspace as a server-driven, event-sourced case workflow. Citizen submission, citizen editing, cancellation, public ticket discovery, status history, and responses to authority questions remain responsibilities of the separate citizen client.

## Routes and role boundary

The feature owns `/tickets` and `/tickets/:ticketId` behind `viewTicketWorkspace`. Dispatcher, officer, and manager roles may enter the workspace; administrators are redirected to the shared forbidden page. Route access is only the coarse client boundary. Object visibility and every concrete workflow command remain backend decisions.

Dispatcher work is limited to tickets awaiting initial or renewed dispatch. Officers work on tickets in which they participate. Managers additionally receive the authority-wide visibility and decisions allowed by the backend. The UI never broadens these scopes from local role assumptions.

## Read model and directory

Generated snake-case DTOs stop at the query and mapper boundary. Ticket components consume feature-owned camel-case models containing the current projection, display references, version, update timestamp, and `allowedActions`.

The directory persists search, lifecycle, public status, workflow state, category, office, date boundaries, sorting, page, and page size in the URL. Search text is capped at the backend limit of 200 characters. The complete directory URL is preserved when a user opens a detail page and uses its explicit return link.

The list intentionally changes layout by device class:

- smartphones render one stacked card per ticket,
- tablets render a two-column card grid,
- desktops render a semantic table from the `lg` breakpoint,
- the detail page reflows into document order on narrow viewports and uses the sticky summary column only where sufficient width exists.

## Server-driven ad-hoc workflow

The ticket lifecycle has a fixed submission start and terminal completion, rejection, or cancellation outcomes. Between these boundaries the current actor chooses among the commands offered for the current projection. Forwarding, cosignature, escalation, citizen questions, redispatch, and completion can therefore form different sequential paths without a fixed intermediate sequence.

The frontend treats this as a sequential, role- and state-controlled ad-hoc workflow. It does not model parallel branches or let users invent new command types.

`allowed_actions` is authoritative. The registry contains UI handlers for the eleven currently known commands:

- dispatch,
- assign or replace the primary officer,
- forward,
- request or perform cosignature,
- escalate or decide an escalation,
- request a citizen response,
- return to dispatch,
- complete.

Unknown future values are ignored safely. Target offices, staff members, escalation managers, and completion outcomes are loaded only from `/tickets/{ticketId}/workflow-options`. The frontend does not reproduce the backend transition matrix or eligibility queries.

Workflow dialogs use the shared resource-action, form, confirmation, and feedback infrastructure. They provide safe initial focus, focus restoration, keyboard dismissal, dirty-input confirmation, field-level validation, an error summary, and explicit confirmation before redispatch or terminal completion. Mutations never create optimistic workflow states: only the confirmed internal ticket response enters the detail cache.

## Event-sourced history

The current ticket detail is the authoritative projection. The frontend never reconstructs current state from the event stream.

The immutable timeline supports all nineteen current ticket event types. Feature-owned Zod parsers validate the payload shape before a renderer uses it. Known events with malformed payloads and unknown future events remain visible through safe fallbacks. Actor, user, and office references enrich presentation without changing the stored event payload. Raw payload is exposed only in development.

Events retain their server sequence and pagination order. Workflow and comment mutations invalidate the event query rather than inserting assumed local events. Image events created by the separate citizen client remain visible in the authority timeline.

## Append-only collaboration and read-only revisioned images

Internal notes and public comments are append-only. The composer defaults to an internal note and presents an explicit warning before a public comment. Stored entries have no edit or delete affordance. Each comment is an article with an accessible label that includes visibility, author, and timestamp.

Ticket images are revisioned by the backend and are read-only in the authority client. The current carousel and the removed-revision audit gallery reuse the shared `MediaGallery` component also used by the Info feature. Upload, cover selection, and removal belong to the separate citizen client and have no authority-facing controls or mutation wrappers.

The ticket contract deliberately has no author-provided alternative-text field. The feature therefore does not invent a visual description. Images use the existing media contract while filename, size, upload time, cover state, and revision state remain available as adjacent text. This known contract limitation is distinct from the Info feature, whose backend requires alternative text.

## Error and cache behavior

Ticket-specific error codes map to localized, non-technical presentations. A no-longer-allowed action, unavailable target, changed projection, or lost object access triggers the affected detail, options, event, and directory queries to refresh. Backend messages are not displayed verbatim.

Query keys keep directory pages, detail, workflow options, events, comments, active images, and image history separate. Successful comments may extend their own confirmed projection, while workflow and image state remain server-owned. Ticket `updatedAt` and `version` are displayed so users can understand recency and the projection represented by the page.

## Accessibility

The feature follows the shared application requirements and adds ticket-specific context:

- category, public status, workflow state, and visibility badges expose their meaning to screen readers rather than relying on color,
- responsibility and metadata use named regions and description lists,
- ticket version changes are exposed through a polite status message,
- comments, events, image galleries, and action groups have explicit accessible names,
- dialogs retain focus, restore it to the exact action trigger, and guard unsaved form input,
- controls preserve the shared minimum 44-pixel target size,
- directory and detail layouts avoid horizontal page scrolling at 320 CSS pixels,
- content remains in a meaningful document order at smartphone, tablet, desktop, zoom, and landscape widths,
- serious and critical Axe findings fail the browser scenarios.

## Test architecture

Pure mapping, labels, URL state, filters, action registries, event renderers, request normalization, and error handling are covered by feature unit tests. Component tests use MSW and the actual query/provider boundaries.

Browser tests keep selectors and API state out of the specifications:

- `tests/e2e/fixtures/ticket-api-data.ts` owns typed reusable ticket, event, comment, image, office, and workflow-option builders,
- `tests/e2e/fixtures/ticket-api.ts` owns the stateful route harness and request logs,
- `tests/e2e/pages/ticket-pages.ts` owns stable user interactions and layout assertions,
- `tests/e2e/tickets.spec.ts` covers officer workflows, dispatcher restrictions, manager completion outcomes, administrator denial, append-only collaboration, read-only image revisions, workflow dirty guards, focus restoration, device-adapted layouts, 320-pixel reflow, and Axe checks.

The generated client contains 23 ticket operations because both clients share the backend OpenAPI contract. The authority feature wraps the internal directory, detail, workflow, event, comment, and image-read operations it needs. Citizen submission and image-mutation operations intentionally remain unwrapped; their presence in generated output is not an unfinished authority UI.
