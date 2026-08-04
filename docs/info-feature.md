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

Create and update use one accessible form but separate request mappers. Local `datetime-local` values are interpreted in `Europe/Berlin` and serialized as timezone-aware instants, including daylight-saving validation. Updates contain only normalized fields that differ from the current server projection. Explicitly clearing description, office assignment (admin only), or address sends `null`, while unchanged address coordinates remain omitted and therefore preserved.

Images remain outside the create request. After the server has created the Info and returned its identifier, media can be managed as separate resources by the following image-management slice. This keeps partial upload failures visible instead of presenting a misleading atomic create workflow.
