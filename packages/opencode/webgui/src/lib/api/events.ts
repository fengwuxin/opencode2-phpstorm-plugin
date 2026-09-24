import { useEffect, useRef, useCallback, useState } from "react"
import type { FileDiff } from "@opencode-ai/sdk/client"
import { V2EventStream } from "./v2/events"

// Event type definitions based on server Bus events
export type ServerEvent =
  | { type: "server.connected"; properties: {} }
  | { type: "server.heartbeat"; properties: {} }
  | { type: "session.created"; properties: { sessionID: string; info: any } }
  | { type: "session.updated"; properties: { sessionID: string; info: any } }
  | { type: "session.deleted"; properties: { sessionID: string; info: any } }
  | { type: "session.error"; properties: { sessionID: string; error: any } }
  | {
      type: "session.status"
      properties: {
        sessionID: string
        status: {
          type: string
          attempt: number
          message: string
          next: number
        }
      }
    }
  | { type: "session.idle"; properties: { sessionID: string } }
  | { type: "session.compacted"; properties: { sessionID: string } }
  | { type: "session.diff"; properties: { sessionID: string; diff: FileDiff[] } }
  | { type: "message.updated"; properties: { info: any } }
  | { type: "message.removed"; properties: { sessionID: string; messageID: string } }
  | {
      type: "message.part.delta"
      properties: { sessionID: string; messageID: string; partID: string; field: string; delta: string }
    }
  | { type: "message.part.updated"; properties: { part: any; delta?: string } }
  | { type: "message.part.removed"; properties: { sessionID: string; messageID: string; partID: string } }
  | { type: "permission.asked"; properties: any }
  | { type: "permission.replied"; properties: any }
  | { type: "question.asked"; properties: any }
  | { type: "question.replied"; properties: { sessionID: string; requestID: string; answers: any[] } }
  | { type: "question.rejected"; properties: { sessionID: string; requestID: string } }
  | { type: "file.edited"; properties: any }
  | { type: "file.updated"; properties: any }
  | { type: "ide.installed"; properties: any }
  | { type: "installation.updated"; properties: any }
  | { type: "lsp.diagnostics"; properties: any }
  | { type: "todo.updated"; properties: any }

export type ConnectionState = "connecting" | "connected" | "disconnected" | "error"

export type EventHandler = (event: ServerEvent) => void

export interface EventEmitterOptions {
  debug?: boolean
}

// Event emitter for managing event subscriptions
export class EventEmitter {
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private allHandlers: Set<EventHandler> = new Set()
  private debug: boolean

  constructor(options: EventEmitterOptions = {}) {
    this.debug = options.debug ?? false
  }

  /**
   * Subscribe to events by type
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (eventType === "*") {
      this.allHandlers.add(handler)
      return () => this.allHandlers.delete(handler)
    }

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)

    return () => {
      const handlers = this.handlers.get(eventType)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.handlers.delete(eventType)
        }
      }
    }
  }

  /**
   * Type-safe subscription helper
   */
  subscribe<T extends ServerEvent["type"]>(
    type: T,
    handler: (event: Extract<ServerEvent, { type: T }>) => void,
  ): () => void {
    return this.on(type, handler as EventHandler)
  }

  emit(event: ServerEvent): void {
    // Log all events to console if debug is enabled
    if (this.debug) {
      console.log("[SSE Event]", event.type, event.properties)
    }

    // Call wildcard handlers
    this.allHandlers.forEach((handler) => {
      try {
        handler(event)
      } catch (error) {
        console.error("Error in wildcard event handler:", error)
      }
    })

    // Call specific event type handlers
    const handlers = this.handlers.get(event.type)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event)
        } catch (error) {
          console.error(`Error in ${event.type} handler:`, error)
        }
      })
    }
  }

  clear(): void {
    this.handlers.clear()
    this.allHandlers.clear()
  }
}

export interface EventStreamOptions {
  url?: string
  directory?: string
  onConnectionStateChange?: (state: ConnectionState) => void
  debug?: boolean
}

/**
 * Hook for managing the opencode v2 SSE event stream connection.
 *
 * The stream is consumed through `fetch` (instead of `EventSource`) so the
 * authorization header can be attached, and v2 events are projected onto the
 * classic event shapes the UI subscribes to.
 *
 * @param options Configuration options
 * @returns Object with connection state, event emitter, and control functions
 */
export function useEventStream(options: EventStreamOptions = {}) {
  const { onConnectionStateChange, debug = false } = options

  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting")
  const emitterRef = useRef<EventEmitter>(new EventEmitter({ debug }))
  const streamRef = useRef<V2EventStream | null>(null)
  const mountedRef = useRef(true)
  const onConnectionStateChangeRef = useRef(onConnectionStateChange)

  // Keep ref up to date
  onConnectionStateChangeRef.current = onConnectionStateChange

  const updateConnectionState = useCallback((state: ConnectionState) => {
    if (!mountedRef.current) return
    setConnectionState(state)
    onConnectionStateChangeRef.current?.(state)
  }, [])

  const connect = useCallback(() => {
    streamRef.current?.stop()
    streamRef.current = null

    if (!mountedRef.current) return

    if (debug) {
      console.log("[SSE] Connecting to event stream...")
    }
    updateConnectionState("connecting")

    const stream = new V2EventStream((event) => {
      if (!mountedRef.current) return
      updateConnectionState("connected")
      emitterRef.current.emit(event)
    })
    streamRef.current = stream
    stream.start()
  }, [updateConnectionState, debug])

  const disconnect = useCallback(() => {
    if (debug) {
      console.log("[SSE] Disconnecting...")
    }

    streamRef.current?.stop()
    streamRef.current = null

    updateConnectionState("disconnected")
  }, [updateConnectionState, debug])

  // Connect on mount
  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      disconnect()
      emitterRef.current.clear()
    }
  }, [connect, disconnect])

  return {
    connectionState,
    emitter: emitterRef.current,
    reconnect: connect,
    disconnect,
  }
}

/**
 * Hook for subscribing to specific event types
 *
 * @param emitter Event emitter from useEventStream
 * @param eventType Event type to listen for (or '*' for all events)
 * @param handler Handler function
 */
export function useEventHandler(emitter: EventEmitter | null, eventType: string, handler: EventHandler) {
  useEffect(() => {
    if (!emitter) return

    const unsubscribe = emitter.on(eventType, handler)
    return unsubscribe
  }, [emitter, eventType, handler])
}

/**
 * Global event emitter singleton for non-hook contexts
 * This should be kept in sync with the emitter from useEventStream
 */
export const eventEmitter = new EventEmitter({ debug: false })
