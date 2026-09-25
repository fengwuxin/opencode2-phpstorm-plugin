import * as http from "http"
import * as crypto from "crypto"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { logger } from "../globals"

export interface SessionHandlers {
  openFile: (path: string) => Promise<void>
  openUrl: (url: string) => Promise<void>
  reloadPath: (path: string) => Promise<void>
  clipboardWrite: (text: string) => Promise<void>
  uiGetState?: () => Promise<any>
  uiSetState?: (state: any) => Promise<void>
}

interface SessionMetadata {
  guiOnly?: boolean
  minVersion?: string
}

interface Session {
  id: string
  token: string
  handlers: SessionHandlers
  metadata: SessionMetadata
  sseClients: Set<http.ServerResponse>
}

interface Message {
  id?: string
  replyTo?: string
  type?: string
  payload?: any
  ok?: boolean
  error?: string
  timestamp: number
}

type BridgeSettings = {
  theme?: "light" | "dark"
  [key: string]: unknown
}

class IdeBridgeServer {
  private server: http.Server | null = null
  private port: number = 0
  private sessions: Map<string, Session> = new Map()
  private keepaliveInterval: NodeJS.Timeout | null = null

  async start(): Promise<void> {
    if (this.server) return

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res))
      this.server.listen(0, "127.0.0.1", () => {
        const addr = this.server!.address()
        if (addr && typeof addr !== "string") {
          this.port = addr.port
          console.log(`IdeBridgeServer started on port ${this.port}`)

          // Start keepalive timer to prevent tunnel timeouts
          if (!this.keepaliveInterval) {
            this.keepaliveInterval = setInterval(() => this.sendKeepaliveToAll(), 15000)
          }

          resolve()
        } else {
          reject(new Error("Failed to get server port"))
        }
      })
      this.server.on("error", (e) => {
        logger.appendLine(`IdeBridgeServer error: ${e}`)
        reject(e)
      })
    })
  }

  stop(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval)
      this.keepaliveInterval = null
    }
    this.server?.close()
    this.server = null
    this.sessions.clear()
  }

  async createSession(handlers: SessionHandlers, metadata: SessionMetadata = {}): Promise<{ sessionId: string; baseUrl: string; token: string }> {
    await this.start() // ensure server is running

    const sessionId = crypto.randomUUID()
    const token = crypto.randomUUID()

    this.sessions.set(sessionId, {
      id: sessionId,
      token,
      handlers,
      metadata,
      sseClients: new Set(),
    })

    return {
      sessionId,
      baseUrl: `http://127.0.0.1:${this.port}/idebridge/${sessionId}`,
      token,
    }
  }

  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      // Close all SSE clients
      session.sseClients.forEach((res) => res.end())
      this.sessions.delete(sessionId)
    }
  }

  send(sessionId: string, message: Omit<Message, "timestamp">): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const msg: Message = { ...message, timestamp: Date.now() }
    this.broadcastSSE(session, JSON.stringify(msg))
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    if (req.method === "OPTIONS") {
      res.writeHead(204)
      res.end()
      return
    }

    // Parse URL: /idebridge/{sessionId}/{action}?token=...
    const url = new URL(req.url || "/", `http://127.0.0.1:${this.port}`)
    const pathParts = url.pathname.split("/").filter(Boolean)

    if (pathParts.length < 3 || pathParts[0] !== "idebridge") {
      res.writeHead(404)
      res.end()
      return
    }

    const sessionId = pathParts[1]
    const action = pathParts[2]
    const token = url.searchParams.get("token")
    const session = this.sessions.get(sessionId)

    if (!session || session.token !== token) {
      logger.appendLine(`IdeBridgeServer unauthorized: sessionId=${sessionId} action=${action}`)
      res.writeHead(401)
      res.end()
      return
    }

    switch (action) {
      case "events":
        this.handleSSE(req, res, session)
        break
      case "send":
        this.handleSend(req, res, session)
        break
      default:
        res.writeHead(404)
        res.end()
    }
  }

  private handleSSE(req: http.IncomingMessage, res: http.ServerResponse, session: Session): void {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx/proxy buffering
    })

    session.sseClients.add(res)

    // Send initial connected event with optional metadata
    try {
      const data: Record<string, any> = {}
      if (session.metadata.guiOnly) data.customApi = false
      if (session.metadata.minVersion) data.minVersion = session.metadata.minVersion
      const connected = JSON.stringify(data)
      res.write(`event: connected\ndata: ${connected}\n\n`)
    } catch (e) {
      logger.appendLine(`IdeBridgeServer failed to init SSE: ${e}`)
    }

    // Handle client disconnect
    req.on("close", () => {
      session.sseClients.delete(res)
    })
  }

  private async handleSend(req: http.IncomingMessage, res: http.ServerResponse, session: Session): Promise<void> {
    if (req.method !== "POST") {
      res.writeHead(405)
      res.end()
      return
    }

    try {
      const body = await this.readBody(req)
      const msg: Message = JSON.parse(body)

      const { type, id, payload } = msg

      switch (type) {
        case "openFile":
          if (payload?.path) {
            await session.handlers.openFile(payload.path)
            this.replyOk(session, id)
          } else {
            this.replyError(session, id, "Missing path")
          }
          break

        case "openUrl":
          if (payload?.url) {
            await session.handlers.openUrl(payload.url)
            this.replyOk(session, id)
          } else {
            this.replyError(session, id, "Missing url")
          }
          break

        case "reloadPath":
          if (payload?.path) {
            await session.handlers.reloadPath(payload.path)
            this.replyOk(session, id)
          } else {
            this.replyError(session, id, "Missing path")
          }
          break

        case "clipboardWrite":
          if (typeof payload?.text === "string") {
            await session.handlers.clipboardWrite(payload.text)
            this.replyOk(session, id)
          } else {
            this.replyError(session, id, "Missing text")
          }
          break

        case "uiGetState": {
          if (!session.handlers.uiGetState) {
            this.replyError(session, id, "uiGetState not supported")
            break
          }
          const state = await session.handlers.uiGetState()
          if (id) {
            this.broadcastSSE(
              session,
              JSON.stringify({
                replyTo: id,
                ok: true,
                payload: { state },
                timestamp: Date.now(),
              }),
            )
          }
          break
        }

        case "kv.get": {
          const file = path.join(this.statePath(), "kv.json")
          try {
            if (fs.existsSync(file)) {
              this.replyWithPayload(session, id, JSON.parse(fs.readFileSync(file, "utf-8")))
            } else {
              this.replyWithPayload(session, id, {})
            }
          } catch {
            this.replyWithPayload(session, id, {})
          }
          break
        }

        case "kv.update": {
          const dir = this.statePath()
          const file = path.join(dir, "kv.json")
          let existing: Record<string, any> = {}
          try {
            if (fs.existsSync(file)) existing = JSON.parse(fs.readFileSync(file, "utf-8"))
          } catch {}
          const merged = { ...existing, ...(payload ?? {}) }
          fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(file, JSON.stringify(merged, null, 2))
          this.replyWithPayload(session, id, merged)
          break
        }

        case "model.get": {
          const file = path.join(this.statePath(), "model.json")
          try {
            if (fs.existsSync(file)) {
              const data = JSON.parse(fs.readFileSync(file, "utf-8"))
              this.replyWithPayload(session, id, {
                recent: Array.isArray(data.recent) ? data.recent : [],
                favorite: Array.isArray(data.favorite) ? data.favorite : [],
                variant: typeof data.variant === "object" && data.variant !== null ? data.variant : {},
                user: Array.isArray(data.user) ? data.user : [],
              })
            } else {
              this.replyWithPayload(session, id, { recent: [], favorite: [], variant: {}, user: [] })
            }
          } catch {
            this.replyWithPayload(session, id, { recent: [], favorite: [], variant: {}, user: [] })
          }
          break
        }

        case "model.update": {
          const dir = this.statePath()
          const file = path.join(dir, "model.json")
          let existing = {
            recent: [] as any[],
            favorite: [] as any[],
            variant: {} as Record<string, string>,
            user: [] as any[],
          }
          try {
            if (fs.existsSync(file)) {
              const data = JSON.parse(fs.readFileSync(file, "utf-8"))
              existing = {
                recent: Array.isArray(data.recent) ? data.recent : [],
                favorite: Array.isArray(data.favorite) ? data.favorite : [],
                variant: typeof data.variant === "object" && data.variant !== null ? data.variant : {},
                user: Array.isArray(data.user) ? data.user : [],
              }
            }
          } catch {}
          if (payload?.recent !== undefined) existing.recent = payload.recent
          if (payload?.favorite !== undefined) existing.favorite = payload.favorite
          if (payload?.user !== undefined) existing.user = payload.user
          if (payload?.variant !== undefined) existing.variant = { ...existing.variant, ...payload.variant }
          fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(file, JSON.stringify(existing))
          this.replyWithPayload(session, id, existing)
          break
        }

        case "uiSetState": {
          if (!session.handlers.uiSetState) {
            this.replyError(session, id, "uiSetState not supported")
            break
          }
          await session.handlers.uiSetState(payload?.state)
          this.replyOk(session, id)
          break
        }

        case "settings.get": {
          this.replyWithPayload(session, id, this.readSettings())
          break
        }

        case "settings.update": {
          const existing = this.readSettings()
          const patch = this.normalizeSettings(payload)
          const merged = this.normalizeSettings({ ...existing, ...patch })
          fs.mkdirSync(this.statePath(), { recursive: true })
          fs.writeFileSync(this.settingsPath(), JSON.stringify(merged, null, 2))
          this.replyWithPayload(session, id, merged)
          break
        }

        default:
          this.replyError(session, id, `Unknown type: ${type}`)
      }

      res.writeHead(204)
    } catch (e) {
      console.error("Error handling send:", e)
      res.writeHead(400)
    }
    res.end()
  }

  private statePath(): string {
    return path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state"), "opencode")
  }

  private settingsPath(): string {
    return path.join(this.statePath(), "settings.json")
  }

  private readSettings(): BridgeSettings {
    try {
      const file = this.settingsPath()
      if (!fs.existsSync(file)) return {}
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"))
      return this.normalizeSettings(parsed)
    } catch {
      return {}
    }
  }

  private normalizeSettings(input: unknown): BridgeSettings {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return {}
    }

    const next = { ...(input as Record<string, unknown>) } as BridgeSettings
    if (next.theme !== undefined && next.theme !== "light" && next.theme !== "dark") {
      delete next.theme
    }
    return next
  }

  private replyWithPayload(session: Session, id: string | undefined, payload: any): void {
    if (!id) return
    this.broadcastSSE(
      session,
      JSON.stringify({
        replyTo: id,
        ok: true,
        payload,
        timestamp: Date.now(),
      }),
    )
  }

  private replyOk(session: Session, id?: string): void {
    if (!id) return
    this.broadcastSSE(
      session,
      JSON.stringify({
        replyTo: id,
        ok: true,
        timestamp: Date.now(),
      }),
    )
  }

  private replyError(session: Session, id: string | undefined, error: string): void {
    if (!id) return
    this.broadcastSSE(
      session,
      JSON.stringify({
        replyTo: id,
        ok: false,
        error,
        timestamp: Date.now(),
      }),
    )
  }

  private sendKeepaliveToAll(): void {
    this.sessions.forEach((session) => {
      const deadClients: http.ServerResponse[] = []
      session.sseClients.forEach((client) => {
        try {
          client.write(": ping\n\n")
        } catch {
          deadClients.push(client)
        }
      })
      deadClients.forEach((client) => {
        session.sseClients.delete(client)
        try {
          client.end()
        } catch {}
      })
    })
  }

  private broadcastSSE(session: Session, json: string): void {
    const deadClients: http.ServerResponse[] = []

    session.sseClients.forEach((client) => {
      try {
        client.write(`event: message\ndata: ${json}\n\n`)
      } catch {
        deadClients.push(client)
      }
    })

    deadClients.forEach((client) => {
      session.sseClients.delete(client)
      try {
        client.end()
      } catch {}
    })
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = ""
      req.on("data", (chunk) => (body += chunk))
      req.on("end", () => resolve(body))
      req.on("error", reject)
    })
  }
}

// Singleton instance
export const bridgeServer = new IdeBridgeServer()
