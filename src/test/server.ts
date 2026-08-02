import { setupServer } from 'msw/node'

/** Provides one resettable request interceptor for integration-style unit tests. */
export const mockApiServer = setupServer()
