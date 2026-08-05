# Info feature

The authority client treats Infos as mutable public notices rather than event-sourced resources.

## Read model

The first feature slice owns `/infos` and `/infos/:infoId` behind `viewInfos`. Dispatcher, officer, manager, and administrator roles may read these routes; citizen-facing pages remain in the separate KMP client.

The directory persists search, office, category, status, date boundaries, server sorting, page, and page size in the URL. `starts_from` uses the start of the selected Europe/Berlin calendar day, while `ends_to` uses its inclusive end. Geographic filtering remains deliberately unexposed until the planned map and radius workflow exists.

Info list cards use `InfoResponse.image_url` only as a decorative preview because the list contract does not carry image alternative text. The detail page loads `/images` separately and renders the mandatory Info-image `alt_text` through the shared media layer.

## Shared media boundary

`src/shared/media` contains presentation-only image primitives. Features adapt their generated DTOs to `MediaAsset` and retain ownership of endpoints, permissions, mutation semantics, and error messages. `altText` is nullable in the shared model so a later Ticket adapter is not forced to invent citizen-authored alternative text. Info adapters always provide the backend-required value.

## Status semantics

The Info status endpoint is presented as a public status log. It is not labeled as an audit history or event stream because content edits are mutable and status rows do not expose an actor in the public response.

## Mutable master-data forms

The second feature slice adds `/infos/new` and `/infos/:infoId/edit` behind `manageInfos`. Administrators may create cross-office publications or select an active office. Officers and managers are bound to their authenticated `officeId`; the edit page additionally mirrors the backend object rule and does not render a form for another office's Info.

Create and update use one accessible form but separate request mappers. Native `datetime-local` controls keep the browser-tested responsive layout and expose the document locale `de-DE`; their canonical local wall-clock value is interpreted in `Europe/Berlin` and serialized as a timezone-aware instant, including daylight-saving validation. Updates contain only normalized fields that differ from the current server projection. Explicitly clearing description, office assignment (admin only), or address sends `null`, while unchanged address coordinates remain omitted and therefore preserved.

Images remain outside the create request, but the create page presents one coordinated form submission. It validates the selected files and required alternative texts, creates the Info first, then uploads the queue sequentially only after the server returns the identifier. A selected prospective cover is uploaded first so the backend's first-image rule makes it the cover. Partial failures are reported explicitly and continue on the edit page rather than being presented as an atomic rollback.

## Current image management

The third feature slice keeps Info image semantics inside the Info feature while extending `src/shared/media` with reusable upload and gallery actions. `MediaUploadQueue` is a thin composition layer; `use-media-upload-queue.ts` owns queue state and sequential uploads, `media-upload-validation.ts` owns pure validation and normalization, and `MediaUploadQueueItem.tsx` renders one actionable entry. The shared queue accepts feature-provided file constraints, an optional description field, an upload callback, and an error formatter. It does not know endpoint paths, permissions, cover rules, or whether another feature physically deletes or event-sources an image.

Info management requires one normalized alternative text per selected image, allows JPEG, PNG, and WebP files up to 5 MiB, and uploads queued files sequentially. Successful files remain successful when a later upload fails; failed entries can be retried individually. Local preview object URLs are revoked when entries are removed or the queue unmounts. Pending files and alternative texts are reported to the parent form and participate in the same unsaved-changes guard as mutable master data. If master data are saved while local edit-page images remain pending, the page stays open and keeps the navigation guard active until the queue is uploaded or discarded.

Upload, cover selection, and physical deletion live on the create/edit surfaces. Existing-image cover selection and deletion use the dedicated Info endpoints and update only from confirmed responses. Deleting the current cover forces a server reload because the backend deterministically selects the oldest remaining image as the replacement. Detail and list projections are invalidated after media mutations because `image_url` and `updated_at` may change. The read-only detail page renders a horizontally scrollable, swipeable gallery with explicit scroll controls and keyboard navigation in the full-size preview. The non-rotating carousel is exposed as a named ARIA region; every item is announced as a positioned slide while all slides remain available in the DOM.

## Status maintenance and permanent deletion

The fourth feature slice keeps the mutable Info lifecycle distinct from event-sourced resources. Authorized administrators, officers, and managers may append any backend-supported status together with an optional public message. The UI does not invent a transition matrix, and repeating the current status remains possible when another public update is needed. The confirmed status response updates the current detail projection, prepends the public status log, and invalidates paginated list projections.

Deleting an Info is a physical and irreversible operation rather than deactivation. The destructive workflow explicitly explains that the notice, owned address, complete status log, image metadata, and image files are removed. It requests no audit reason because the backend neither accepts nor retains one. After the `204` response, all detail-owned query data is removed, list projections are invalidated, and navigation returns to the preserved directory URL.

## Error presentation and search limits

The shared list URL state and search control cap free-text queries at the backend-wide maximum of 200 characters. Info directory failures for invalid date ranges and missing timezone information receive feature-specific German messages. Current-detail, edit, status, and lifecycle surfaces also distinguish `INFO_STATUS_NOT_FOUND` from an ordinary missing Info because it indicates an inconsistent server projection rather than a user-remediable form error.

## E2E test structure

Browser tests keep workflows readable by separating responsibilities: `tests/e2e/fixtures/info-api.ts` and `office-api.ts` provide stateful API harnesses, `tests/e2e/pages/info-pages.ts` owns stable Info selectors and interactions, and `tests/e2e/fixtures/accessibility.ts` centralizes the serious/critical Axe assertion used by both feature suites. Specifications remain focused on role behavior and user-visible outcomes.
