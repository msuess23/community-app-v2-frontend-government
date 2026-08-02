export const REFRESH_TOKEN_STORAGE_KEY =
  'community-app-authority-client.refresh-token'

const STORED_REFRESH_TOKEN_VERSION = 1

export type RefreshTokenPersistence = 'persistent' | 'session'

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type TokenSnapshot = Readonly<{
  accessToken: string | null
  refreshToken: string | null
  refreshTokenPersistence: RefreshTokenPersistence | null
  sessionId: string | null
}>

export type TokenStoreChange = Readonly<{
  previousSnapshot: TokenSnapshot
  source: 'external' | 'local'
}>

export type TokenStoreListener = (
  snapshot: TokenSnapshot,
  change: TokenStoreChange,
) => void

type StorageEventTarget = Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener'
>

type TokenStoreOptions = {
  createSessionId?: () => string
  eventTarget?: StorageEventTarget
  localStorage?: Storage
  sessionStorage?: Storage
}

type SetTokenOptions = Readonly<{
  sessionId?: string
}>

type StoredRefreshSession = Readonly<{
  refreshToken: string
  sessionId: string
}>

/** Stores browser authentication tokens and publishes immutable session snapshots. */
export class TokenStore {
  private accessToken: string | null = null
  private readonly createSessionId: () => string
  private readonly eventTarget?: StorageEventTarget
  private readonly listeners = new Set<TokenStoreListener>()
  private readonly localStorage?: Storage
  private snapshot: TokenSnapshot
  private readonly sessionStorage?: Storage

  constructor(options: TokenStoreOptions = {}) {
    this.localStorage = options.localStorage
    this.sessionStorage = options.sessionStorage
    this.eventTarget = options.eventTarget
    this.createSessionId = options.createSessionId ?? createBrowserSessionId
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
    this.publishSnapshot('local')
  }

  /** Persists a token pair and optionally preserves an existing logical session ID. */
  setTokens(
    tokens: AuthTokens,
    persistence: RefreshTokenPersistence = 'session',
    options: SetTokenOptions = {},
  ): void {
    const storage =
      persistence === 'persistent' ? this.localStorage : this.sessionStorage

    if (!storage) {
      throw new Error(
        `The ${persistence} refresh-token storage is not available.`,
      )
    }

    const sessionId = options.sessionId ?? this.createSessionId()

    try {
      this.removeStoredRefreshTokens()
      storage.setItem(
        REFRESH_TOKEN_STORAGE_KEY,
        serializeRefreshSession({
          refreshToken: tokens.refreshToken,
          sessionId,
        }),
      )
    } catch (error) {
      this.accessToken = null
      this.publishSnapshot('local')
      throw error
    }

    this.accessToken = tokens.accessToken
    this.publishSnapshot('local')
  }

  clear(): void {
    const hadTokens =
      this.accessToken !== null || this.snapshot.refreshToken !== null

    this.accessToken = null

    try {
      this.removeStoredRefreshTokens()
    } finally {
      if (hadTokens) {
        this.publishSnapshot('local')
      }
    }
  }

  /** Re-reads the shared persistent session after cross-tab synchronization. */
  synchronizePersistentSession(): TokenSnapshot {
    // A tab-local login is independent from all persistent storage changes.
    if (readStoredRefreshSession(this.sessionStorage) !== null) {
      return this.snapshot
    }

    const previousSessionId = this.snapshot.sessionId
    const nextSession = readStoredRefreshSession(this.localStorage)

    // A rotation of the same logical session does not invalidate this tab's
    // access token. Replacing or removing the account does.
    if (previousSessionId !== nextSession?.sessionId) {
      this.accessToken = null
    }

    this.publishSnapshot('external')
    return this.snapshot
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

    this.synchronizePersistentSession()
  }

  private createSnapshot(): TokenSnapshot {
    const sessionRefreshSession = readStoredRefreshSession(this.sessionStorage)

    if (sessionRefreshSession !== null) {
      return Object.freeze({
        accessToken: this.accessToken,
        refreshToken: sessionRefreshSession.refreshToken,
        refreshTokenPersistence: 'session' as const,
        sessionId: sessionRefreshSession.sessionId,
      })
    }

    const persistentRefreshSession = readStoredRefreshSession(this.localStorage)

    return Object.freeze({
      accessToken: this.accessToken,
      refreshToken: persistentRefreshSession?.refreshToken ?? null,
      refreshTokenPersistence:
        persistentRefreshSession === null ? null : ('persistent' as const),
      sessionId: persistentRefreshSession?.sessionId ?? null,
    })
  }

  /** Publishes a changed immutable snapshot with its local or external origin. */
  private publishSnapshot(source: TokenStoreChange['source']): void {
    const previousSnapshot = this.snapshot
    const nextSnapshot = this.createSnapshot()

    if (snapshotsEqual(previousSnapshot, nextSnapshot)) {
      return
    }

    this.snapshot = nextSnapshot
    const change = Object.freeze({ previousSnapshot, source })

    for (const listener of this.listeners) {
      listener(this.snapshot, change)
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

/** Creates a non-secret identifier for one logical browser login. */
function createBrowserSessionId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

/** Serializes the refresh token and its stable session identity atomically. */
function serializeRefreshSession(session: StoredRefreshSession): string {
  return JSON.stringify({
    refreshToken: session.refreshToken,
    sessionId: session.sessionId,
    version: STORED_REFRESH_TOKEN_VERSION,
  })
}

/** Reads both the current envelope and the raw-token format used by older clients. */
function readStoredRefreshSession(
  storage: Storage | undefined,
): StoredRefreshSession | null {
  let storedValue: string | null

  try {
    storedValue = storage?.getItem(REFRESH_TOKEN_STORAGE_KEY) ?? null
  } catch {
    return null
  }

  if (!storedValue) {
    return null
  }

  try {
    const parsed = JSON.parse(storedValue) as unknown

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      parsed.version === STORED_REFRESH_TOKEN_VERSION &&
      'refreshToken' in parsed &&
      typeof parsed.refreshToken === 'string' &&
      parsed.refreshToken.length > 0 &&
      'sessionId' in parsed &&
      typeof parsed.sessionId === 'string' &&
      parsed.sessionId.length > 0
    ) {
      return Object.freeze({
        refreshToken: parsed.refreshToken,
        sessionId: parsed.sessionId,
      })
    }
  } catch {
    // A raw value is a legacy refresh token and is migrated on the next rotation.
  }

  return Object.freeze({
    refreshToken: storedValue,
    sessionId: createLegacySessionId(storedValue),
  })
}

/** Creates a stable fingerprint without retaining the retired token as metadata. */
function createLegacySessionId(refreshToken: string): string {
  let hash = 0xcbf29ce484222325n

  for (const character of refreshToken) {
    hash ^= BigInt(character.codePointAt(0) ?? 0)
    hash = BigInt.asUintN(64, hash * 0x100000001b3n)
  }

  return `legacy-${hash.toString(16).padStart(16, '0')}`
}

/** Compares immutable token snapshots before notifying subscribers. */
function snapshotsEqual(
  left: TokenSnapshot,
  right: TokenSnapshot,
): boolean {
  return (
    left.accessToken === right.accessToken &&
    left.refreshToken === right.refreshToken &&
    left.refreshTokenPersistence === right.refreshTokenPersistence &&
    left.sessionId === right.sessionId
  )
}
