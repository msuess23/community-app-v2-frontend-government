import { z } from 'zod'

const environmentSchema = z.object({
  VITE_API_BASE_URL: z.string().trim().min(1).default('/api/v1'),
})

export type Environment = {
  apiBaseUrl: string
}

export function parseEnvironment(input: unknown): Environment {
  const environment = environmentSchema.parse(input)

  return {
    apiBaseUrl: environment.VITE_API_BASE_URL.replace(/\/$/, ''),
  }
}

export const environment = parseEnvironment(import.meta.env)
