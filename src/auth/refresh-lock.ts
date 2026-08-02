export const AUTH_REFRESH_LOCK_NAME =
  'community-app-authority-client.auth-refresh'
export const AUTH_REFRESH_FALLBACK_LOCK_KEY =
  'community-app-authority-client.auth-refresh-lock'

const DEFAULT_LEASE_DURATION_MS = 30_000
const DEFAULT_RETRY_DELAY_MS = 50
const DEFAULT_SETTLE_DELAY_MS = 40

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

type StorageEventTarget = Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener'
>

type StorageRefreshLockOptions = Readonly<{
  createOwnerId?: () => string
  eventTarget?: StorageEventTarget
  leaseDurationMs?: number
  now?: () => number
  retryDelayMs?: number
  settleDelayMs?: number
  storage: Storage
  wait?: (milliseconds: number) => Promise<void>
}>

type RefreshLockLease = Readonly<{
  expiresAt: number
  ownerId: string
}>

/** Uses Web Locks when available and falls back to a shared storage lease. */
export function createRefreshLock(
  lockManager: LockManagerLike | null | undefined = getBrowserLockManager(),
  fallbackLock: RefreshLock | null | undefined = getBrowserStorageRefreshLock(),
): RefreshLock {
  return {
    runExclusive: async <Result>(task: () => Promise<Result>) => {
      if (lockManager) {
        return lockManager.request(AUTH_REFRESH_LOCK_NAME, task)
      }

      if (fallbackLock) {
        return fallbackLock.runExclusive(task)
      }

      return task()
    },
  }
}

/** Creates a best-effort cross-tab mutex for browsers without the Web Locks API. */
export function createStorageRefreshLock({
  createOwnerId = createBrowserOwnerId,
  eventTarget,
  leaseDurationMs = DEFAULT_LEASE_DURATION_MS,
  now = Date.now,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  settleDelayMs = DEFAULT_SETTLE_DELAY_MS,
  storage,
  wait = delay,
}: StorageRefreshLockOptions): RefreshLock {
  return {
    runExclusive: async <Result>(task: () => Promise<Result>) => {
      const ownerId = createOwnerId()

      try {
        await acquireStorageLease({
          eventTarget,
          leaseDurationMs,
          now,
          ownerId,
          retryDelayMs,
          settleDelayMs,
          storage,
          wait,
        })
      } catch {
        // Storage can be disabled by privacy settings. The in-tab coordinator
        // still prevents duplicate rotations, so the request remains usable.
        return task()
      }

      const heartbeat = setInterval(
        () => {
          renewStorageLease(storage, ownerId, now() + leaseDurationMs)
        },
        Math.max(1_000, Math.floor(leaseDurationMs / 3)),
      )

      try {
        return await task()
      } finally {
        clearInterval(heartbeat)
        releaseStorageLease(storage, ownerId)
      }
    },
  }
}

export const refreshLock = createRefreshLock()

type AcquireStorageLeaseOptions = Readonly<{
  eventTarget?: StorageEventTarget
  leaseDurationMs: number
  now: () => number
  ownerId: string
  retryDelayMs: number
  settleDelayMs: number
  storage: Storage
  wait: (milliseconds: number) => Promise<void>
}>

/** Waits until this tab owns the shared refresh lease. */
async function acquireStorageLease({
  eventTarget,
  leaseDurationMs,
  now,
  ownerId,
  retryDelayMs,
  settleDelayMs,
  storage,
  wait,
}: AcquireStorageLeaseOptions): Promise<void> {
  while (true) {
    const currentTime = now()
    const currentLease = readStorageLease(storage)

    if (!currentLease || currentLease.expiresAt <= currentTime) {
      writeStorageLease(storage, {
        expiresAt: currentTime + leaseDurationMs,
        ownerId,
      })

      // A short stabilization period lets simultaneous contenders observe the
      // final writer before either starts a single-use refresh request.
      await wait(settleDelayMs)

      if (readStorageLease(storage)?.ownerId === ownerId) {
        return
      }
    }

    await waitForStorageChange(eventTarget, retryDelayMs, wait)
  }
}

/** Extends an owned lease while the refresh request is still running. */
function renewStorageLease(
  storage: Storage,
  ownerId: string,
  expiresAt: number,
): void {
  if (readStorageLease(storage)?.ownerId !== ownerId) {
    return
  }

  writeStorageLease(storage, { expiresAt, ownerId })
}

/** Removes the shared lease only when it is still owned by this tab. */
function releaseStorageLease(storage: Storage, ownerId: string): void {
  if (readStorageLease(storage)?.ownerId !== ownerId) {
    return
  }

  try {
    storage.removeItem(AUTH_REFRESH_FALLBACK_LOCK_KEY)
  } catch {
    // A completed request must not fail because storage became unavailable.
  }
}

/** Reads and validates the current shared lease without trusting stored JSON. */
function readStorageLease(storage: Storage): RefreshLockLease | null {
  let value: string | null

  try {
    value = storage.getItem(AUTH_REFRESH_FALLBACK_LOCK_KEY)
  } catch {
    return null
  }

  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'expiresAt' in parsed &&
      typeof parsed.expiresAt === 'number' &&
      Number.isFinite(parsed.expiresAt) &&
      'ownerId' in parsed &&
      typeof parsed.ownerId === 'string' &&
      parsed.ownerId.length > 0
    ) {
      return {
        expiresAt: parsed.expiresAt,
        ownerId: parsed.ownerId,
      }
    }
  } catch {
    return null
  }

  return null
}

/** Replaces the shared lease as one atomic storage value. */
function writeStorageLease(storage: Storage, lease: RefreshLockLease): void {
  storage.setItem(AUTH_REFRESH_FALLBACK_LOCK_KEY, JSON.stringify(lease))
}

/** Waits for either a lease storage event or the next polling interval. */
function waitForStorageChange(
  eventTarget: StorageEventTarget | undefined,
  milliseconds: number,
  wait: (milliseconds: number) => Promise<void>,
): Promise<void> {
  if (!eventTarget) {
    return wait(milliseconds)
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) {
        return
      }

      settled = true
      eventTarget.removeEventListener('storage', handleStorage)
      resolve()
    }
    const handleStorage = (event: Event) => {
      const storageEvent = event as StorageEvent

      if (
        storageEvent.key === null ||
        storageEvent.key === AUTH_REFRESH_FALLBACK_LOCK_KEY
      ) {
        finish()
      }
    }

    eventTarget.addEventListener('storage', handleStorage)
    void wait(milliseconds).then(finish, finish)
  })
}

/** Reads the browser Web Locks implementation without assuming availability. */
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

/** Creates the browser storage fallback when localStorage is accessible. */
function getBrowserStorageRefreshLock(): RefreshLock | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    return createStorageRefreshLock({
      eventTarget: window,
      storage: window.localStorage,
    })
  } catch {
    return undefined
  }
}

/** Creates a unique owner identity for one fallback-lock attempt. */
function createBrowserOwnerId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `owner-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

/** Resolves after the requested fallback-lock polling interval. */
function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}
