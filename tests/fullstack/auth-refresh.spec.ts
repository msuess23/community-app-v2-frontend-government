import { expect, test } from '@playwright/test'

import {
  expectRealTokenRefreshAfterReload,
  loginThroughUi,
} from './fixtures/auth.js'
import { SEED_ACCOUNTS } from './fixtures/fullstack-environment.js'
import { AdminPageObject } from './pages/fullstack-pages.js'

test('real login restores the authority session through a rotated refresh token', async ({
  browser,
}) => {
  const session = await loginThroughUi(
    browser,
    SEED_ACCOUNTS.admin,
    '/offices',
    true,
  )

  try {
    await expect(
      session.page.getByRole('heading', { level: 1, name: 'Behörden' }),
    ).toBeVisible()
    await expectRealTokenRefreshAfterReload(session.page, 'persistent')
    await expect(
      session.page.getByRole('heading', { level: 1, name: 'Behörden' }),
    ).toBeVisible()

    await new AdminPageObject(session.page).expectTicketAndAppointmentRoutesForbidden()
  } finally {
    await session.context.close()
  }
})
