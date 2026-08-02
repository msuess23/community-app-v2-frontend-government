import { isApiError } from '@/api/client/api-error'
import { requestTokenRefresh } from '@/auth/refresh-api'
import { refreshLock, type RefreshLock } from '@/auth/refresh-lock'
import {
  sessionEvents,
  type SessionEventBus,
} from '@/auth/session-events'
import {
  tokenStore,
  type AuthTokens,
  type TokenStore,
} from '@/auth/token-store'

export type TokenRefreshFunction = (refreshToken: string) => Promise<AuthTokens>

type RefreshCoordinatorOptions = {
  events?: SessionEventBus
  lock?: RefreshLock
  refreshTokens?: TokenRefreshFunction
  store?: TokenStore
}

export class RefreshCoordinator {
  private readonly events: SessionEventBus
  private inFlight: Promise<boolean> | null = null
  private readonly lock: RefreshLock
  private readonly refreshTokens: TokenRefreshFunction
  private readonly store: TokenStore

  constructor({
    events = sessionEvents,
    lock = refreshLock,
    refreshTokens = requestTokenRefresh,
    store = tokenStore,
  }: RefreshCoordinatorOptions = {}) {
    this.events = events
    this.lock = lock
    this.refreshTokens = refreshTokens
    this.store = store
  }

  refresh(): Promise<boolean> {
    if (this.inFlight) {
      return this.inFlight
    }

    const expectedSessionId = this.store.getSnapshot().sessionId
    const refreshPromise = this.lock
      .runExclusive(() => this.rotateCurrentToken(expectedSessionId))
      .finally(() => {
        if (this.inFlight === refreshPromise) {
          this.inFlight = null
        }
      })

    this.inFlight = refreshPromise
    return refreshPromise
  }

  /** Rotates the latest stored token only for the session that requested it. */
  private async rotateCurrentToken(
    expectedSessionId: string | null,
  ): Promise<boolean> {
    const initialSnapshot = this.store.synchronizePersistentSession()
    const refreshToken = initialSnapshot.refreshToken
    const persistence = initialSnapshot.refreshTokenPersistence
    const sessionId = initialSnapshot.sessionId

    if (
      !refreshToken ||
      !persistence ||
      !sessionId ||
      sessionId !== expectedSessionId
    ) {
      return false
    }

    try {
      const tokens = await this.refreshTokens(refreshToken)

      if (!this.sessionMatches(refreshToken, persistence, sessionId)) {
        return false
      }

      this.store.setTokens(tokens, persistence, { sessionId })
      return true
    } catch (error) {
      if (
        isRejectedRefresh(error) &&
        this.sessionMatches(refreshToken, persistence, sessionId)
      ) {
        // Publish the reason before clearing storage so the session can retain it.
        this.events.emit({
          reason: 'refresh-rejected',
          type: 'session-expired',
        })
        this.store.clear()
      }

      throw error
    }
  }

  private sessionMatches(
    refreshToken: string,
    persistence: 'persistent' | 'session',
    sessionId: string,
  ): boolean {
    const currentSnapshot = this.store.getSnapshot()

    return (
      currentSnapshot.refreshToken === refreshToken &&
      currentSnapshot.refreshTokenPersistence === persistence &&
      currentSnapshot.sessionId === sessionId
    )
  }
}

export const refreshCoordinator = new RefreshCoordinator()

function isRejectedRefresh(error: unknown): boolean {
  return isApiError(error) && error.status === 401
}
