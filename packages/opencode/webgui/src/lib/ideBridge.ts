type Message = {
  id?: string
  replyTo?: string
  type: string
  payload?: any
  timestamp?: number
  ok?: boolean
  error?: string
}

export type IdeBridgeSettings = {
  theme?: "light" | "dark"
  [key: string]: unknown
}

type Handler = (message: Message) => void

// Parse URL params once at module load
const params = new URLSearchParams(window.location.search)
const bridgeBase = params.get("ideBridge")
const token = params.get("ideBridgeToken")

class IdeBridge {
  ready = false
  customApi = true
  minVersion: string | null = null
  private queue: Message[] = []
  private handlers: Set<Handler> = new Set()
  private pending = new Map<string, { resolve: (m: Message) => void; reject: (e: any) => void }>()
  private eventSource: EventSource | null = null
  private reconnectDelay = 1000
  private readonly maxReconnectDelay = 30000
  private reconnectScheduled = false
  private connectErrorLogged = false

  isInstalled(): boolean {
    return !!(bridgeBase && token)
  }

  init() {
    this.connect()
  }

  private connect() {
    if (!bridgeBase || !token) return

    const url = `${bridgeBase}/events?token=${encodeURIComponent(token)}`
    try {
      this.eventSource = new EventSource(url)
    } catch (e) {
      console.warn("[ideBridge] Failed to create EventSource", { bridgeBase }, e)
      this.ready = false
      this.scheduleReconnect()
      return
    }

    this.eventSource.addEventListener("connected", (ev: MessageEvent) => {
      try {
        const data = JSON.parse(String(ev.data))
        if (typeof data.customApi === "boolean") {
          this.customApi = data.customApi
        }
        if (typeof data.minVersion === "string") {
          this.minVersion = data.minVersion
        }
      } catch {
      }
      try {
        window.dispatchEvent(new Event("opencode:idebridge-connected"))
      } catch {}
    })

    this.eventSource.onopen = () => {
      this.ready = true
      this.reconnectDelay = 1000
      this.connectErrorLogged = false
      console.log("[ideBridge] Connected", { bridgeBase })
      this.flushQueue()

      void this.getState().then((state) => {
        try {
          window.dispatchEvent(new CustomEvent("opencode:ui-bridge-state", { detail: { state } }))
        } catch {}
      })

      void this.getSettings().then((settings) => {
        try {
          window.dispatchEvent(new CustomEvent("opencode:ui-bridge-settings", { detail: { settings } }))
        } catch {}
      })
    }

    this.eventSource.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as Message
        this.dispatch(msg)
      } catch (e) {
        console.warn("[ideBridge] Failed to parse SSE message:", e)
      }
    }

    this.eventSource.onerror = () => {
      if (!this.connectErrorLogged) {
        this.connectErrorLogged = true
        console.warn("[ideBridge] Connection error", {
          bridgeBase,
          readyState: this.eventSource?.readyState,
        })
      }
      this.ready = false
      this.scheduleReconnect()
    }
  }

  onReady(handler: () => void) {
    const run = () => {
      try {
        handler()
      } catch {}
    }

    if (this.ready) {
      run()
      return () => {}
    }

    const listener = () => run()
    window.addEventListener("opencode:idebridge-ready", listener)
    return () => window.removeEventListener("opencode:idebridge-ready", listener)
  }

  private scheduleReconnect() {
    if (this.reconnectScheduled) return
    this.reconnectScheduled = true
    this.eventSource?.close()
    this.eventSource = null
    setTimeout(() => {
      this.reconnectScheduled = false
      this.connect()
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
  }

  private dispatch(msg: Message) {
    if (msg && msg.replyTo) {
      const p = this.pending.get(msg.replyTo)
      if (p) {
        this.pending.delete(msg.replyTo)
        p.resolve(msg)
        return
      }
    }
    this.handlers.forEach((h) => {
      try {
        h(msg)
      } catch {}
    })
  }

  on(handler: Handler) {
    this.handlers.add(handler)
  }

  off(handler: Handler) {
    this.handlers.delete(handler)
  }

  send(msg: Message) {
    if (!bridgeBase || !token) {
      console.warn("[ideBridge] Bridge not configured, ignoring send:", msg.type)
      return
    }

    if (!this.ready) {
      this.queue.push(msg)
      return
    }

    this.doSend(msg)
  }

  private async doSend(msg: Message, retryCount = 0) {
    if (!bridgeBase || !token) return

    const quiet =
      msg.type === "uiGetState" ||
      msg.type === "uiSetState" ||
      msg.type === "settings.get" ||
      msg.type === "settings.update"

    try {
      const response = await fetch(`${bridgeBase}/send?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      })

      if (!response.ok) {
        if (!quiet) console.warn("[ideBridge] Send failed with status:", response.status)
        // Requeue on server errors (5xx) with limited retries
        if (response.status >= 500 && retryCount < 3) {
          this.requeueWithBackoff(msg, retryCount)
        }
      }
    } catch (e) {
      if (!quiet) console.warn("[ideBridge] Send failed:", e)
      // Network error - requeue with backoff
      if (retryCount < 3) {
        this.requeueWithBackoff(msg, retryCount)
      }
    }
  }

  private requeueWithBackoff(msg: Message, retryCount: number) {
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
    setTimeout(() => {
      if (this.ready) {
        this.doSend(msg, retryCount + 1)
      } else {
        this.queue.push(msg)
      }
    }, delay)
  }

  request<T = any>(type: string, payload?: any, timeoutMs = 10000): Promise<Message & { result?: T }> {
    return new Promise((resolve, reject) => {
      if (!this.isInstalled()) {
        reject(new Error("[ideBridge] Bridge not installed"))
        return
      }
      try {
        const id = String(Date.now()) + Math.random().toString(36).slice(2)
        const timer = setTimeout(() => {
          if (this.pending.delete(id)) {
            reject(new Error(`[ideBridge] Request timed out: ${type}`))
          }
        }, timeoutMs)
        this.pending.set(id, {
          resolve: (msg) => {
            clearTimeout(timer)
            resolve(msg)
          },
          reject: (error) => {
            clearTimeout(timer)
            reject(error)
          },
        })
        this.send({ id, type, payload, timestamp: Date.now() })
      } catch (e) {
        reject(e)
      }
    })
  }

  private flushQueue() {
    const q = this.queue.splice(0, this.queue.length)
    for (const msg of q) {
      this.doSend(msg)
    }

    try {
      window.dispatchEvent(new Event("opencode:idebridge-ready"))
    } catch {}
  }

  async getState<T = any>(): Promise<T | null> {
    try {
      const res = await this.request<{ state: T }>("uiGetState")
      const state = (res as any)?.payload?.state
      return (state ?? null) as T | null
    } catch {
      return null
    }
  }

  async setState(state: any): Promise<boolean> {
    try {
      const res = await this.request("uiSetState", { state })
      return !!(res as any)?.ok
    } catch {
      return false
    }
  }

  async getSettings<T extends IdeBridgeSettings = IdeBridgeSettings>(): Promise<T | null> {
    try {
      const res = await this.request<T>("settings.get")
      const settings = (res as any)?.payload
      if (!settings || typeof settings !== "object") return null
      return settings as T
    } catch {
      return null
    }
  }

  async updateSettings<T extends IdeBridgeSettings = IdeBridgeSettings>(
    patch: Partial<T>,
  ): Promise<T | null> {
    try {
      const res = await this.request<T>("settings.update", patch)
      const settings = (res as any)?.payload
      if (!settings || typeof settings !== "object") return null
      return settings as T
    } catch {
      return null
    }
  }
}

export const ideBridge = new IdeBridge()

export function reloadPath(path: string, operation: "write" | "edit" | "apply_patch") {
  if (!ideBridge.isInstalled()) return
  ideBridge.send({ type: "reloadPath", payload: { path, operation } })
}
