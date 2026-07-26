import type { QueryClient } from '@tanstack/react-query'

import { authApi, type AuthApi } from '@/auth/auth-api'
import type {
  AuthState,
  AuthUser,
  LoginInput,
  RegisterInput,
} from '@/auth/auth-types'
import {
  refreshCoordinator,
  type RefreshCoordinator,
} from '@/auth/refresh-coordinator'
import {
  sessionEvents,
  type SessionEventBus,
} from '@/auth/session-events'
import {
  tokenStore,
  type RefreshTokenPersistence,
  type TokenSnapshot,
  type TokenStore,
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

export class AuthOperationSupersededError extends Error {
  constructor() {
    super('The authentication operation was superseded by a newer action.')
    this.name = 'AuthOperationSupersededError'
  }
}

export class AuthSession {
  private readonly api: AuthApi
  private readonly events: SessionEventBus
  private clearingLocalSession = false
  private initialization: Promise<AuthUser | null> | null = null
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

  subscribe = (listener: AuthStateListener): (() => void) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  start(): () => void {
    const unsubscribeEvents = this.events.subscribe(() => {
      this.clearLocalSession()
    })
    const unsubscribeStore = this.store.subscribe((snapshot) => {
      this.handleTokenSnapshot(snapshot)
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

  async logoutAll(): Promise<void> {
    ++this.operationVersion

    try {
      await this.api.logoutAll()
    } finally {
      this.clearLocalSession()
    }
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

  private clearLocalSession(): void {
    if (this.clearingLocalSession) {
      return
    }

    this.clearingLocalSession = true

    try {
      ++this.operationVersion
      this.publish(ANONYMOUS_STATE)
      this.store.clear()
      this.resetQueryCache()
    } finally {
      this.clearingLocalSession = false
    }
  }

  private handleTokenSnapshot(snapshot: TokenSnapshot): void {
    if (snapshot.refreshToken === null) {
      this.clearLocalSession()
    }
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
