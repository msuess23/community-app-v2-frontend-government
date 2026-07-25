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
      client: 'react-query',
      httpClient: 'fetch',
    },
  },
})
