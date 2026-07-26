export const REFRESH_TOKEN_STORAGE_KEY =
  'community-app-authority-client.refresh-token'

export type RefreshTokenPersistence = 'persistent' | 'session'

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type TokenSnapshot = Readonly<{
  accessToken: string | null
  refreshToken: string | null
  refreshTokenPersistence: RefreshTokenPersistence | null
}>

export type TokenStoreListener = (snapshot: TokenSnapshot) => void

type StorageEventTarget = Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener'
>

type TokenStoreOptions = {
  eventTarget?: StorageEventTarget
  localStorage?: Storage
  sessionStorage?: Storage
}

export class TokenStore {
  private accessToken: string | null = null
  private readonly eventTarget?: StorageEventTarget
  private readonly listeners = new Set<TokenStoreListener>()
  private readonly localStorage?: Storage
  private snapshot: TokenSnapshot
  private readonly sessionStorage?: Storage

  constructor(options: TokenStoreOptions = {}) {
    this.localStorage = options.localStorage
    this.sessionStorage = options.sessionStorage
    this.eventTarget = options.eventTarget
    this.snapshot = this.createSnapshot()
    this.eventTarget?.addEventListener('storage', this.handleStorageEvent)
  }

  getAccessToken(): string | null {
    return this.accessToken
  }

  getRefreshToken(): string | null {
    return this.snapshot.refreshToken
  }

  getSnapshot(): TokenSnapshot {
    return this.snapshot
  }

  setAccessToken(accessToken: string | null): void {
    if (this.accessToken === accessToken) {
      return
    }

    this.accessToken = accessToken
    this.publishSnapshot()
  }

  setTokens(
    tokens: AuthTokens,
    persistence: RefreshTokenPersistence = 'session',
  ): void {
    const storage =
      persistence === 'persistent' ? this.localStorage : this.sessionStorage

    if (!storage) {
      throw new Error(
        `The ${persistence} refresh-token storage is not available.`,
      )
    }

    try {
      this.removeStoredRefreshTokens()
      storage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken)
    } catch (error) {
      this.accessToken = null
      this.publishSnapshot()
      throw error
    }

    this.accessToken = tokens.accessToken
    this.publishSnapshot()
  }

  clear(): void {
    const hadTokens =
      this.accessToken !== null || this.snapshot.refreshToken !== null

    this.accessToken = null

    try {
      this.removeStoredRefreshTokens()
    } finally {
      if (hadTokens) {
        this.publishSnapshot()
      }
    }
  }

  subscribe(listener: TokenStoreListener): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  destroy(): void {
    this.eventTarget?.removeEventListener('storage', this.handleStorageEvent)
    this.listeners.clear()
  }

  private readonly handleStorageEvent = (event: Event): void => {
    const storageEvent = event as StorageEvent

    if (
      (storageEvent.key !== null &&
        storageEvent.key !== REFRESH_TOKEN_STORAGE_KEY) ||
      (storageEvent.storageArea !== null &&
        storageEvent.storageArea !== this.localStorage)
    ) {
      return
    }

    // sessionStorage represents an independent tab-local session. A change to
    // the shared persistent token must not replace that session.
    if (readStorage(this.sessionStorage) !== null) {
      return
    }

    // A persistent refresh token changed in another tab. The access token in
    // this tab may now belong to an obsolete token generation and is discarded.
    this.accessToken = null
    this.publishSnapshot()
  }

  private createSnapshot(): TokenSnapshot {
    const sessionRefreshToken = readStorage(this.sessionStorage)

    if (sessionRefreshToken !== null) {
      return Object.freeze({
        accessToken: this.accessToken,
        refreshToken: sessionRefreshToken,
        refreshTokenPersistence: 'session' as const,
      })
    }

    const persistentRefreshToken = readStorage(this.localStorage)

    return Object.freeze({
      accessToken: this.accessToken,
      refreshToken: persistentRefreshToken,
      refreshTokenPersistence:
        persistentRefreshToken === null ? null : ('persistent' as const),
    })
  }

  private publishSnapshot(): void {
    const nextSnapshot = this.createSnapshot()

    if (snapshotsEqual(this.snapshot, nextSnapshot)) {
      return
    }

    this.snapshot = nextSnapshot

    for (const listener of this.listeners) {
      listener(this.snapshot)
    }
  }

  private removeStoredRefreshTokens(): void {
    let removalError: unknown

    for (const storage of [this.sessionStorage, this.localStorage]) {
      try {
        storage?.removeItem(REFRESH_TOKEN_STORAGE_KEY)
      } catch (error) {
        removalError ??= error
      }
    }

    if (removalError !== undefined) {
      throw removalError
    }
  }
}

export function createTokenStore(
  options: TokenStoreOptions = getBrowserTokenStoreOptions(),
): TokenStore {
  return new TokenStore(options)
}

export const tokenStore = createTokenStore()

function getBrowserTokenStoreOptions(): TokenStoreOptions {
  if (typeof window === 'undefined') {
    return {}
  }

  return {
    eventTarget: window,
    localStorage: getWindowStorage('localStorage'),
    sessionStorage: getWindowStorage('sessionStorage'),
  }
}

function getWindowStorage(
  name: 'localStorage' | 'sessionStorage',
): Storage | undefined {
  try {
    return window[name]
  } catch {
    return undefined
  }
}

function readStorage(storage: Storage | undefined): string | null {
  try {
    return storage?.getItem(REFRESH_TOKEN_STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

function snapshotsEqual(
  left: TokenSnapshot,
  right: TokenSnapshot,
): boolean {
  return (
    left.accessToken === right.accessToken &&
    left.refreshToken === right.refreshToken &&
    left.refreshTokenPersistence === right.refreshTokenPersistence
  )
}
