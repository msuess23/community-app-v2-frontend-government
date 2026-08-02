# OpenAPI contract snapshot

`openapi.json` is the versioned API contract used by Orval. It is committed so
client generation does not depend on a running backend during every frontend
build.

Update the snapshot deliberately with:

```bash
npm run api:pull
npm run api:generate
```

`OPENAPI_URL` can override the default development endpoint. Review changes to
the snapshot and generated client together before committing them.
