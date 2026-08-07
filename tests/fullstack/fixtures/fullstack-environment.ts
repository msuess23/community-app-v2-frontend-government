export type FullStackAccount = Readonly<{
  email: string
  firstName: string
  lastName: string
  password: string
}>

export const FULLSTACK_FRONTEND_BASE_URL =
  process.env.FULLSTACK_FRONTEND_BASE_URL ?? 'http://localhost:5173'

export const FULLSTACK_API_BASE_URL =
  process.env.FULLSTACK_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export const FULLSTACK_SEED_PASSWORD =
  process.env.FULLSTACK_SEED_PASSWORD ?? 'password123'

export const SEED_ACCOUNTS = {
  admin: {
    email: 'admin@test.com',
    firstName: 'Armin',
    lastName: 'Admin',
    password: FULLSTACK_SEED_PASSWORD,
  },
  bauamtManager: {
    email: 'manager1@bauamt.com',
    firstName: 'Max',
    lastName: 'Manager',
    password: FULLSTACK_SEED_PASSWORD,
  },
  bauamtOfficer: {
    email: 'officer1@bauamt.com',
    firstName: 'Olaf',
    lastName: 'Officer',
    password: FULLSTACK_SEED_PASSWORD,
  },
  dispatcher: {
    email: 'dispatcher1@bauamt.com',
    firstName: 'Dave',
    lastName: 'Dispatcher',
    password: FULLSTACK_SEED_PASSWORD,
  },
} as const satisfies Readonly<Record<string, FullStackAccount>>

export const SEED_NEW_TICKET_TITLE = '[Demo] Schlagloch am Rathausplatz'
export const SEED_SCHEDULED_APPOINTMENT_REASON =
  'Discuss a building-file inspection request.'

export function createScenarioIdentity(): Readonly<{
  manager: FullStackAccount
  officerA: FullStackAccount
  officerB: FullStackAccount
  officeName: string
  infoTitle: string
}> {
  const password = 'FullStackTestPassword123!'

  return {
    manager: {
      email: 'fullstack-manager@example.test',
      firstName: 'Mara',
      lastName: 'Integration',
      password,
    },
    officerA: {
      email: 'fullstack-officer-a@example.test',
      firstName: 'Oskar',
      lastName: 'Integration',
      password,
    },
    officerB: {
      email: 'fullstack-officer-b@example.test',
      firstName: 'Olivia',
      lastName: 'Integration',
      password,
    },
    officeName: 'Full-Stack-Testamt',
    infoTitle: 'Full-Stack-Testmitteilung',
  }
}
