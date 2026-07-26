export const AUTH_REFRESH_LOCK_NAME =
  'community-app-authority-client.auth-refresh'

export type ExclusiveTask = <Result>(
  task: () => Promise<Result>,
) => Promise<Result>

export type RefreshLock = {
  runExclusive: ExclusiveTask
}

type LockManagerLike = {
  request<Result>(
    name: string,
    callback: () => Promise<Result>,
  ): Promise<Result>
}

export function createRefreshLock(
  lockManager: LockManagerLike | null | undefined = getBrowserLockManager(),
): RefreshLock {
  return {
    runExclusive: async <Result>(task: () => Promise<Result>) => {
      if (!lockManager) {
        return task()
      }

      return lockManager.request(AUTH_REFRESH_LOCK_NAME, task)
    },
  }
}

export const refreshLock = createRefreshLock()

function getBrowserLockManager(): LockManagerLike | undefined {
  if (typeof navigator === 'undefined') {
    return undefined
  }

  try {
    return navigator.locks
  } catch {
    return undefined
  }
}
