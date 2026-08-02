import type { QueryClient } from '@tanstack/react-query'

import { authApi, type AuthApi } from '@/auth/auth-api'
import type {
  AuthSessionEndReason,
  AuthState,
  AuthUser,
  LoginInput,
  RegisterInput,
  UpdateCurrentUserInput,
} from '@/auth/auth-types'
import {
  refreshCoordinator,
  type RefreshCoordinator,
} from '@/auth/refresh-coordinator'
import { sessionEvents, type SessionEventBus } from '@/auth/session-events'
import {
  tokenStore,
  type RefreshTokenPersistence,
  type TokenSnapshot,
  type TokenStore,
  type TokenStoreChange,
} from '@/auth/token-store'

const ANONYMOUS_STATE: AuthState = Object.freeze({
  status: 'anonymous',
  user: null,
})

const INITIALIZING_STATE: AuthState = Object.freeze({
  status: 'initializing',
  user: null,
})

export type AuthStateListener = () => void

type QueryCache = Pick<QueryClient, 'cancelQueries' | 'clear'>

type AuthSessionOptions = Readonly<{
  api?: AuthApi
  events?: SessionEventBus
  queryClient: QueryCache
  refresh?: Pick<RefreshCoordinator, 'refresh'>
  store?: TokenStore
}>

/** Indicates that a newer authentication action invalidated an in-flight operation. */
export class AuthOperationSupersededError extends Error {
  constructor() {
    super('The authentication operation was superseded by a newer action.')
    this.name = 'AuthOperationSupersededError'
  }
}

/** Coordinates authentication state, token storage and user profile restoration. */
export class AuthSession {
  private readonly api: AuthApi
  private readonly events: SessionEventBus
  private clearingLocalSession = false
  private initialization: Promise<AuthUser | null> | null = null
  private lastEndReason: AuthSessionEndReason | null = null
  private readonly listeners = new Set<AuthStateListener>()
  private operationVersion = 0
  private readonly queryClient: QueryCache
  private readonly refresh: Pick<RefreshCoordinator, 'refresh'>
  private snapshot: AuthState
  private readonly store: TokenStore

  constructor({
    api = authApi,
    events = sessionEvents,
    queryClient,
    refresh = refreshCoordinator,
    store = tokenStore,
  }: AuthSessionOptions) {
    this.api = api
    this.events = events
    this.queryClient = queryClient
    this.refresh = refresh
    this.store = store
    this.snapshot = store.getRefreshToken()
      ? INITIALIZING_STATE
      : ANONYMOUS_STATE
  }

  getSnapshot = (): AuthState => this.snapshot

  /** Returns and clears the reason attached to the most recent session end. */
  consumeEndReason(): AuthSessionEndReason | null {
    const reason = this.lastEndReason
    this.lastEndReason = null
    return reason
  }

  subscribe = (listener: AuthStateListener): (() => void) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  start(): () => void {
    const unsubscribeEvents = this.events.subscribe((event) => {
      this.clearLocalSession(event.reason)
    })
    const unsubscribeStore = this.store.subscribe((snapshot, change) => {
      this.handleTokenSnapshot(snapshot, change)
    })

    return () => {
      unsubscribeEvents()
      unsubscribeStore()
    }
  }

  initialize(): Promise<AuthUser | null> {
    if (this.snapshot.status === 'authenticated') {
      return Promise.resolve(this.snapshot.user)
    }

    if (!this.store.getRefreshToken()) {
      this.publish(ANONYMOUS_STATE)
      return Promise.resolve(null)
    }

    if (this.initialization) {
      return this.initialization
    }

    const operationVersion = this.operationVersion
    this.publish(INITIALIZING_STATE)

    const initialization = this.restoreSession(operationVersion).finally(() => {
      if (this.initialization === initialization) {
        this.initialization = null
      }
    })

    this.initialization = initialization
    return initialization
  }

  async login(input: LoginInput): Promise<AuthUser> {
    const operationVersion = ++this.operationVersion
    const tokens = await this.api.login(input)

    this.assertCurrentOperation(operationVersion)

    const persistence: RefreshTokenPersistence = input.rememberMe
      ? 'persistent'
      : 'session'
    this.store.setTokens(tokens, persistence)

    try {
      const user = await this.api.getCurrentUser()
      this.assertAuthenticatedOperation(operationVersion, tokens.accessToken)
      this.resetQueryCache()
      this.publishAuthenticated(user)
      return user
    } catch (error) {
      if (operationVersion === this.operationVersion) {
        this.clearLocalSession()
      }

      throw error
    }
  }

  register(input: RegisterInput): Promise<AuthUser> {
    return this.api.register(input)
  }

  /**
   * Reloads the authenticated profile so role assignments become visible without a new login.
   */
  async refreshCurrentUser(): Promise<AuthUser> {
    if (this.snapshot.status !== 'authenticated') {
      throw new Error(
        'Cannot refresh the user profile without an active session.',
      )
    }

    const operationVersion = this.operationVersion
    const user = await this.api.getCurrentUser()
    this.assertCurrentOperation(operationVersion)

    if (this.snapshot.status !== 'authenticated') {
      throw new AuthOperationSupersededError()
    }

    this.publishAuthenticated(user)
    return user
  }

  async logout(): Promise<void> {
    const refreshToken = this.store.getRefreshToken()

    this.clearLocalSession()

    if (!refreshToken) {
      return
    }

    try {
      await this.api.logout(refreshToken)
    } catch {
      // The local session must remain terminated if the backend is unavailable.
    }
  }

  /** Invalidates every server session and always terminates the local session. */
  async logoutAll(): Promise<void> {
    ++this.operationVersion
    let endReason: AuthSessionEndReason = 'logout-all-complete'

    try {
      await this.api.logoutAll()
    } catch {
      // Local sign-out remains mandatory even when the server cannot revoke other sessions.
      endReason = 'logout-all-local-only'
    } finally {
      this.clearLocalSession(endReason)
    }
  }

  /** Updates profile fields owned by the current user and publishes the new snapshot. */
  async updateCurrentUser(input: UpdateCurrentUserInput): Promise<AuthUser> {
    if (this.snapshot.status !== 'authenticated') {
      throw new Error(
        'Cannot update the user profile without an active session.',
      )
    }

    const operationVersion = this.operationVersion
    const user = await this.api.updateCurrentUser(input)
    this.assertCurrentOperation(operationVersion)

    if (this.snapshot.status !== 'authenticated') {
      throw new AuthOperationSupersededError()
    }

    this.publishAuthenticated(user)
    return user
  }

  private assertAuthenticatedOperation(
    operationVersion: number,
    accessToken: string,
  ): void {
    this.assertCurrentOperation(operationVersion)

    if (this.store.getAccessToken() !== accessToken) {
      throw new AuthOperationSupersededError()
    }
  }

  private assertCurrentOperation(operationVersion: number): void {
    if (operationVersion !== this.operationVersion) {
      throw new AuthOperationSupersededError()
    }
  }

  private clearLocalSession(
    endReason: AuthSessionEndReason | null = null,
  ): void {
    if (this.clearingLocalSession) {
      return
    }

    this.clearingLocalSession = true

    try {
      this.lastEndReason = endReason
      ++this.operationVersion
      this.publish(ANONYMOUS_STATE)
      this.store.clear()
      this.resetQueryCache()
    } finally {
      this.clearingLocalSession = false
    }
  }

  /** Reacts only to externally published persistent-session changes. */
  private handleTokenSnapshot(
    snapshot: TokenSnapshot,
    change: TokenStoreChange,
  ): void {
    if (change.source !== 'external') {
      return
    }

    const sessionIdentityChanged =
      change.previousSnapshot.sessionId !== snapshot.sessionId

    if (!sessionIdentityChanged) {
      return
    }

    if (snapshot.refreshToken === null) {
      this.clearLocalSession('session-ended-in-another-tab')
      return
    }

    void this.synchronizeExternalSession().catch(() => undefined)
  }

  /** Rebuilds user state after another tab replaces the shared persistent login. */
  private synchronizeExternalSession(): Promise<AuthUser | null> {
    const operationVersion = ++this.operationVersion
    this.initialization = null
    this.lastEndReason = null
    this.resetQueryCache()
    this.publish(INITIALIZING_STATE)

    const synchronization = this.restoreSession(operationVersion).finally(
      () => {
        if (this.initialization === synchronization) {
          this.initialization = null
        }
      },
    )

    this.initialization = synchronization
    return synchronization
  }

  private publish(state: AuthState): void {
    if (statesEqual(this.snapshot, state)) {
      return
    }

    this.snapshot = state

    for (const listener of this.listeners) {
      listener()
    }
  }

  private publishAuthenticated(user: AuthUser): void {
    this.lastEndReason = null
    this.publish(
      Object.freeze({
        status: 'authenticated',
        user,
      }),
    )
  }

  private resetQueryCache(): void {
    void this.queryClient.cancelQueries()
    this.queryClient.clear()
  }

  private async restoreSession(
    operationVersion: number,
  ): Promise<AuthUser | null> {
    try {
      const refreshed = await this.refresh.refresh()

      if (!refreshed) {
        if (operationVersion === this.operationVersion) {
          this.publish(ANONYMOUS_STATE)
        }
        return null
      }

      const user = await this.api.getCurrentUser()
      this.assertCurrentOperation(operationVersion)

      if (!this.store.getAccessToken()) {
        throw new AuthOperationSupersededError()
      }

      this.publishAuthenticated(user)
      return user
    } catch (error) {
      if (operationVersion === this.operationVersion) {
        this.resetQueryCache()
        this.publish(ANONYMOUS_STATE)
      }

      throw error
    }
  }
}

export function createAuthSession(options: AuthSessionOptions): AuthSession {
  return new AuthSession(options)
}

function statesEqual(left: AuthState, right: AuthState): boolean {
  return left.status === right.status && left.user === right.user
}
