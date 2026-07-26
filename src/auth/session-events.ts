export type SessionExpiredReason = 'refresh-rejected'

export type SessionEvent = Readonly<{
  reason: SessionExpiredReason
  type: 'session-expired'
}>

export type SessionEventListener = (event: SessionEvent) => void

export class SessionEventBus {
  private readonly listeners = new Set<SessionEventListener>()

  emit(event: SessionEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  subscribe(listener: SessionEventListener): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  clearListeners(): void {
    this.listeners.clear()
  }
}

export const sessionEvents = new SessionEventBus()
