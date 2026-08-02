# Resource Detail, Actions & Event Timeline

This foundation defines the shared structure used by ticket, appointment, information, user and office detail pages. It deliberately contains no feature-specific routes or API calls.

## Detail layout

`ResourceDetailLayout` composes:

- an explicit return link,
- the primary page heading and current status,
- optional top-level actions,
- anchor navigation for long pages,
- a responsive content column,
- an optional sticky side column.

Named content regions use `ResourceDetailSection`. Compact attributes use `ResourceMetadataList`, which renders a semantic description list rather than a visual grid of unrelated text.

Feature list links should preserve their complete URL state:

```tsx
const location = useLocation()

<Link
  state={createResourceDetailNavigationState(location)}
  to={`/tickets/${ticket.id}`}
>
  {ticket.title}
</Link>
```

The detail route resolves a safe return target instead of relying on browser history:

```tsx
const location = useLocation()
const returnTo = resolveResourceDetailReturnTo(location.state, '/tickets')
```

Only internal absolute paths are accepted. Protocol-relative and malformed values fall back to the feature list.

## Server-driven actions

The backend projection is the source of truth for currently possible commands. Feature modules register their known UI handlers with `createResourceActionRegistry()` and pass the response `allowed_actions` to `ResourceActionBar`.

The bar:

- preserves backend order,
- removes duplicate action values,
- renders only registered actions,
- ignores unknown actions safely,
- reports unknown values in development,
- replaces a withdrawn action form with a clear stale-state notice,
- restores focus to the original trigger.

Unknown actions must never be guessed from the current role. A newer backend may expose a command that the deployed frontend does not understand; hiding that command is safer than submitting an invented payload.

Each feature owns the form rendered inside an action dialog. The shared dialog supplies accessible modal behavior, a force-close callback for successful completion and `registerCloseGuard()` for edited forms. A feature should register its dirty-state confirmation in an effect and remove it on cleanup. Escape and the close button respect that guard; a successful server action may call `close()` after its state has been committed. Feature forms continue to use the common form workflow and validation primitives.

## Mutation lifecycle

`useResourceActionMutation()` standardizes command execution:

1. execute the feature-owned request,
2. accept only the server response as the new detail projection,
3. cancel an older detail request before updating the cache,
4. invalidate related lists and event streams,
5. show global success feedback,
6. refresh affected projections after HTTP 409,
7. present safe localized feedback without exposing technical backend messages.

A ticket action should normally return its current internal detail response. Its cache plan should update the detail key and invalidate at least the relevant list and event keys. Optimistic workflow-state changes are intentionally not part of this foundation.

## Event timeline

Features map backend event responses to the generic `ResourceEvent` shape:

```ts
{
  id,
  sequenceNumber,
  eventType,
  occurredAt,
  actor,
  payload,
}
```

`EventTimeline` never sorts, merges or removes events. The feature query must supply the server-defined order. Each entry displays its immutable sequence number, timestamp and actor when available.

Feature-owned renderers translate stable event types into localized titles, descriptions and optional detail content. Unknown event types receive a safe fallback. Raw payload is hidden in production and may be exposed only through the explicit development-details option.

Pagination is explicit. A feature may combine already fetched pages and provide `hasOlderEvents`, `isLoadingOlder` and `onLoadOlder`; the timeline does not assume whether page one contains the newest or oldest records.

## Accessibility requirements

- The return target is a real link and does not depend on JavaScript history.
- Long pages expose a named section navigation.
- Detail attributes use `dl`, `dt` and `dd` semantics.
- Action buttons are grouped and named.
- Modal action workflows support Escape, safe initial focus and focus restoration.
- Timeline entries are an ordered list of articles.
- Timestamps use semantic `time` elements.
- Event meaning is expressed in text, not color alone.
- Unknown events remain understandable without development payload.
- Loading older events changes the button label and uses `aria-busy`.

## Feature boundaries

This patch does not define:

- ticket or appointment routes,
- concrete action request schemas,
- concrete event translations,
- actor or office lookup queries,
- comments, image galleries or document versions,
- activity polling or real-time updates,
- audit export.

Those belong to the feature that owns the backend contract. The shared layer provides only reusable layout, interaction and lifecycle behavior.
