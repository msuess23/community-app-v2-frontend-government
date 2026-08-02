import { defineConfig } from 'orval'

export default defineConfig({
  communityApp: {
    input: {
      target: './openapi/openapi.json',
    },

    output: {
      mode: 'tags-split',
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/models',
      client: 'fetch',
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: './src/api/client/api-fetch.ts',
          name: 'apiFetch',
        },
      },
    },
  },
})
