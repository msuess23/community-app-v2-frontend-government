# API Contract and Feature Architecture

## Purpose

This foundation configures Orval as the owner of the generated OpenAPI transport layer and defines how concrete authority features join the application. It deliberately adds no generated client files and no empty Ticket, Appointment, Info or Administration screens.

## Generated API boundary

`openapi/openapi.json` remains the versioned backend contract. Running `npm run api:generate` creates the transport layer below `src/api/generated` with:

- TypeScript schemas derived from the OpenAPI components,
- typed request functions for the documented operations,
- query parameter and request body types,
- tag-based endpoint files created by Orval.

Files below `src/api/generated` are generated artifacts and must not be edited manually. This patch intentionally does not contain those files; every developer generates them from the checked-in OpenAPI snapshot with the project command.

Orval is configured with `client: 'fetch'` and the existing authenticated `apiFetch` mutator. The generated layer therefore owns only HTTP transport typing. Query keys, cache invalidation, DTO mapping and feature lifecycle rules remain in the feature module where their application semantics are known.

The generator runs with clean output, Prettier formatting and warning failures:

```bash
npm run api:generate
```

Run generation after applying this patch and whenever the OpenAPI snapshot changes. Review the generated changes before committing them.

## DTO mapping boundary

Components must not consume generated transport DTOs directly. A feature defines a UI model with application naming and maps at its API boundary:

```ts
import type { UserResponse } from '@/api/generated/models'

type UserSummary = Readonly<{
  firstName: string
  id: string
}>

function mapUserSummary(dto: UserResponse): UserSummary {
  return {
    firstName: dto.first_name,
    id: dto.id,
  }
}
```

`createMappedQueryOptions()` passes TanStack Query's abort signal to a generated request and caches the mapped model, not the transport DTO. `mapApiPage()` converts the backend page envelope from `data`, `size`, `pages` and `total` to the shared UI page model.

Request mappers perform the reverse conversion for create and update payloads. They belong to the feature rather than the shared contract package because field semantics are feature-specific.

## Feature modules

Every concrete feature owns its API adapters, models, queries, pages, actions, event renderers and tests. The recommended structure is:

```text
src/features/<feature>/
  api/
  components/
  model/
  pages/
  permissions/
  queries/
  routes/
  tests/
  index.ts
```

The feature's public `index.ts` exports one `AppFeatureModule` created with `defineFeatureModule()`. The module declares one entry capability and may contribute:

- relative child routes for the authenticated App-Shell,
- primary navigation entries that inherit the same capability.

The registry wraps every module route tree with `RequireCapability`, so a feature cannot accidentally protect only its navigation while leaving a URL directly reachable.

Concrete modules are registered only in `src/app/features/index.ts`. `createFeatureRegistry()` rejects duplicate module ids, duplicate navigation targets and absolute routes that could escape the protected route tree.

The order in the registry defines route and navigation order. A module is registered only when its initial route is useful; placeholder navigation entries are not added.

## Capabilities

The capability matrix distinguishes application access from feature intent:

- Ticket workspace, dispatch, case work and escalation decisions,
- Appointment workspace, slot management and document management,
- Info management,
- user visibility and administration,
- office administration.

Capabilities control route and navigation eligibility only. They never replace backend authorization or the resource-specific `allowed_actions` returned by Ticket and Appointment projections.

The backend user-directory route includes `ADMIN` through its dedicated `USER_DIRECTORY_ROLES` group. This keeps administrative discovery separate from the broader authority workflow roles used by Ticket and other domains.

## Contract refresh workflow

Use the checked-in snapshot without contacting a backend:

```bash
npm run api:validate
npm run api:generate
```

When the backend contract changes and the backend is available locally:

```bash
npm run api:sync
```

`api:sync` downloads the OpenAPI document and then runs Orval. The default source is `http://localhost:8000/api/v1/openapi.json`; set `OPENAPI_URL` to use another backend URL.

After either workflow, inspect the generated output and run the normal verification commands:

```bash
git status --short
npm run verify:fast
```

The OpenAPI snapshot, Orval configuration and generated output should be committed together when the contract changes.

## Known backend contract limitations

The OpenAPI snapshot currently lacks precise binary response content for appointment document downloads and Ticket/Info image content. Orval therefore cannot provide reliable `Blob` return types for those operations yet. The corresponding backend routes should declare their binary media responses before media and document features use generated download functions.

Event responses expose actor ids but not a safe display projection. Ticket and Appointment feature work must resolve that backend contract before promising human-readable audit actors.
