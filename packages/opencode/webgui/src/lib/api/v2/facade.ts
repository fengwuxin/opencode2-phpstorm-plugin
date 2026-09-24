/**
 * opencode v2 implementation of the SDK surface the web UI uses.
 *
 * Server calls mirror the legacy `{ data, error }` envelope so the existing call
 * sites keep working unchanged. The `auth` methods intentionally return raw values
 * because that is what the settings UI expects.
 */

import type { Agent, Command, Config, FileDiff, Provider, Session } from "@opencode-ai/sdk/client"
import { apiData, apiFetch, getRequestDirectory, jsonInit, setRequestDirectory } from "./client"
import {
  projectAgent,
  projectCommand,
  projectConfig,
  projectDiff,
  projectMessage,
  projectProvider,
  projectSession,
} from "./project"
import type { V2Agent, V2Command, V2Message, V2Model, V2Provider, V2Session } from "./types"

type Result<T> = { data: T; error: null } | { data: null; error: { message: string; data?: unknown } }

function ok<T>(data: T): Result<T> {
  return { data, error: null }
}

function fail<T>(error: unknown, fallback: string): Result<T> {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : fallback
  return { data: null, error: { message } }
}

async function wrap<T>(run: () => Promise<T>, fallback: string): Promise<Result<T>> {
  try {
    return ok(await run())
  } catch (error) {
    return fail<T>(error, fallback)
  }
}

/** Remembers permission/form requests so replies can be routed to the owning session. */
const permissionSessions = new Map<string, string>()
const formSessions = new Map<string, string>()

export function rememberPermission(id: string, sessionID: string) {
  permissionSessions.set(id, sessionID)
}

export function rememberForm(id: string, sessionID: string) {
  formSessions.set(id, sessionID)
}

export function forgetPermission(id: string) {
  permissionSessions.delete(id)
}

export function forgetForm(id: string) {
  formSessions.delete(id)
}

/** Converts legacy prompt parts into the v2 prompt payload. */
function promptPayload(body: Record<string, unknown>): Record<string, unknown> {
  const parts = Array.isArray(body.parts) ? (body.parts as Record<string, unknown>[]) : []
  const text = parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("\n")

  const files = parts
    .filter((part) => part.type === "file")
    .map((part) => {
      const rawURL = typeof part.url === "string" ? part.url : ""
      // opencode v2 reads the file from the URI and rejects `:start-end` suffixes,
      // so the line range is stripped and passed as separate fields.
      const match = /^(.*?):(\d+)(?:-(\d+))?$/.exec(rawURL)
      const uri = match ? match[1] : rawURL
      const attachment: Record<string, unknown> = {
        mime: typeof part.mime === "string" && part.mime.length > 0 ? part.mime : "text/plain",
        name: typeof part.filename === "string" ? part.filename : undefined,
        uri,
      }
      if (match) {
        attachment.start = Number(match[2])
        attachment.end = Number(match[3] ?? match[2])
      }
      return attachment
    })

  const agents = parts
    .filter((part) => part.type === "agent" && typeof part.name === "string")
    .map((part) => ({ name: part.name as string }))

  const payload: Record<string, unknown> = { text }
  if (files.length > 0) payload.files = files
  if (agents.length > 0) payload.agents = agents
  if (typeof body.messageID === "string") payload.id = body.messageID
  return payload
}

/** Applies the model/agent selection that v2 expects as separate endpoints. */
async function applySelection(sessionID: string, body: Record<string, unknown>): Promise<void> {
  const model = body.model
  if (model && typeof model === "object") {
    const providerID = (model as Record<string, unknown>).providerID
    const modelID = (model as Record<string, unknown>).modelID
    if (typeof providerID === "string" && typeof modelID === "string") {
      const variant = body.variant
      await apiData(
        `/api/session/${sessionID}/model`,
        jsonInit("POST", {
          model: { id: modelID, providerID, ...(typeof variant === "string" && variant ? { variant } : {}) },
        })
      )
    }
  }

  const agent = body.agent
  if (typeof agent === "string" && agent.length > 0) {
    await apiData(`/api/session/${sessionID}/agent`, jsonInit("POST", { agent }))
  }
}

async function loadSession(sessionID: string): Promise<Session> {
  return projectSession(await apiData<V2Session>(`/api/session/${sessionID}`))
}

/**
 * The project directory the UI is currently working on. Falls back to querying the
 * server location when the project context has not initialised yet.
 */
async function currentDirectory(): Promise<string | undefined> {
  const cached = getRequestDirectory()
  if (cached) return cached
  try {
    const location = await apiData<{ directory?: string }>("/api/location")
    if (location?.directory) {
      setRequestDirectory(location.directory)
      return location.directory
    }
  } catch {
    // fall through: without a directory the session list is not filtered
  }
  return undefined
}

export const sessionApi = {
  list: () =>
    wrap<Session[]>(async () => {
      // opencode v2 ignores directory filters on this endpoint, so the list is scoped
      // to the project the plugin was started for.
      const directory = await currentDirectory()
      const sessions = await apiData<V2Session[]>("/api/session?limit=200")
      const scoped = directory
        ? sessions.filter((session) => (session.location?.directory ?? "") === directory)
        : sessions
      return scoped.map(projectSession)
    }, "Failed to load sessions"),

  create: (options?: { body?: Record<string, unknown> }) =>
    wrap<Session>(async () => {
      const directory = getRequestDirectory()
      const body: Record<string, unknown> = { ...(options?.body ?? {}) }
      if (directory) body.location = { directory }
      const session = await apiData<V2Session>("/api/session", jsonInit("POST", body))
      return projectSession(session)
    }, "Failed to create session"),

  get: (options: { path: { id: string } }) =>
    wrap<Session>(async () => loadSession(options.path.id), "Failed to load session"),

  update: (options: { path: { id: string }; body?: Record<string, unknown> }) =>
    wrap<Session>(async () => {
      await apiData(`/api/session/${options.path.id}`, jsonInit("PATCH", options.body ?? {}))
      return loadSession(options.path.id)
    }, "Failed to update session"),

  delete: (options: { path: { id: string } }) =>
    wrap<Record<string, never>>(async () => {
      await apiData(`/api/session/${options.path.id}`, { method: "DELETE" })
      return {}
    }, "Failed to delete session"),

  fork: (options: { path: { id: string }; body?: Record<string, unknown> }) =>
    wrap<Session>(async () => {
      const session = await apiData<V2Session>(
        `/api/session/${options.path.id}/fork`,
        jsonInit("POST", options.body ?? {})
      )
      return projectSession(session)
    }, "Failed to fork session"),

  messages: (options: { path: { id: string }; query?: { limit?: number } }) =>
    wrap(async () => {
      const sessionID = options.path.id
      const limit = options.query?.limit ?? 200
      const messages = await apiData<V2Message[]>(`/api/session/${sessionID}/message?limit=${limit}`)
      return messages
        .map((message) => projectMessage(message, sessionID))
        .filter((message): message is NonNullable<typeof message> => message !== null)
    }, "Failed to load messages"),

  prompt: (options: { path: { id: string }; body?: Record<string, unknown> }) =>
    wrap<unknown>(async () => {
      const sessionID = options.path.id
      const body = options.body ?? {}
      await applySelection(sessionID, body)
      return apiData(`/api/session/${sessionID}/prompt`, jsonInit("POST", promptPayload(body)))
    }, "Failed to send message"),

  command: (options: { path: { id: string }; body?: Record<string, unknown> }) =>
    wrap<unknown>(async () => {
      const sessionID = options.path.id
      const body = options.body ?? {}
      await applySelection(sessionID, body)
      const name = typeof body.command === "string" ? body.command.replace(/^\//, "") : ""
      const args = Array.isArray(body.arguments) ? (body.arguments as string[]).join(" ") : ""
      return apiData(`/api/session/${sessionID}/command`, jsonInit("POST", { name, text: args }))
    }, "Failed to execute command"),

  abort: (options: { path: { id: string } }) =>
    wrap<Record<string, never>>(async () => {
      await apiData(`/api/session/${options.path.id}/interrupt`, jsonInit("POST", {}))
      return {}
    }, "Failed to abort session"),

  diff: (options: { path: { id: string }; query?: Record<string, unknown> }) =>
    wrap<FileDiff[]>(async () => {
      const diff = await apiData<unknown>(`/api/session/${options.path.id}/diff`)
      const list = Array.isArray(diff) ? diff : []
      return list.map((entry) => projectDiff(entry as Record<string, unknown>))
    }, "Failed to load session diff"),

  revert: (options: { path: { id: string }; body?: { messageID?: string } }) =>
    wrap<Session>(async () => {
      const sessionID = options.path.id
      const messageID = options.body?.messageID
      if (messageID) {
        await apiData(`/api/session/${sessionID}/revert/stage`, jsonInit("POST", { messageID }))
      }
      await apiData(`/api/session/${sessionID}/revert/commit`, jsonInit("POST", {}))
      return loadSession(sessionID)
    }, "Failed to revert session"),

  unrevert: (options: { path: { id: string } }) =>
    wrap<Session>(async () => {
      await apiData(`/api/session/${options.path.id}/revert`, { method: "DELETE" })
      return loadSession(options.path.id)
    }, "Failed to restore session"),

  summarize: (options: { path: { id: string }; body?: Record<string, unknown> }) =>
    wrap<Session>(async () => {
      await apiData(`/api/session/${options.path.id}/compact`, jsonInit("POST", options.body ?? {}))
      return loadSession(options.path.id)
    }, "Failed to compact session"),

  // opencode v2 has no session sharing and no custom retry endpoint: report success
  // with the current session so the UI stays consistent.
  share: (options: { path: { id: string } }) => wrap<Session>(async () => loadSession(options.path.id), "Failed to share"),
  unshare: (options: { path: { id: string } }) =>
    wrap<Session>(async () => loadSession(options.path.id), "Failed to unshare"),
  retry: (options: { path: { sessionID: string } }) =>
    wrap<Session>(async () => loadSession(options.path.sessionID), "Failed to retry"),
}

export const configApi = {
  get: () =>
    wrap<Config>(async () => {
      const [documents, defaults] = await Promise.all([
        apiData<unknown[]>("/api/config").catch(() => [] as unknown[]),
        apiData<{ id?: string; providerID?: string } | null>("/api/model/default").catch(() => null),
      ])
      const config = projectConfig(documents) as Record<string, unknown>
      if (defaults?.id && defaults?.providerID) config.model = `${defaults.providerID}/${defaults.id}`
      return config as unknown as Config
    }, "Failed to load configuration"),

  update: (_options?: { body?: Record<string, unknown> }) =>
    wrap<Config>(async () => {
      throw new Error("Editing the opencode configuration is not supported by this plugin yet")
    }, "Configuration updates are not supported by opencode v2"),

  providers: () =>
    wrap<{ providers: Provider[]; default: Record<string, string> }>(async (): Promise<{ providers: Provider[]; default: Record<string, string> }> => {
      const [providers, models, defaults] = await Promise.all([
        apiData<V2Provider[]>("/api/provider"),
        apiData<V2Model[]>("/api/model").catch(() => [] as V2Model[]),
        apiData<{ id?: string; providerID?: string } | null>("/api/model/default").catch(() => null),
      ])

      const projected = providers.map((provider) => projectProvider(provider, models))
      return {
        providers: projected,
        default: defaults?.id && defaults?.providerID ? { provider: defaults.providerID, model: defaults.id } : {},
      }
    }, "Failed to load providers"),
}

export const appApi = {
  agents: () =>
    wrap<Agent[]>(async () => {
      const agents = await apiData<V2Agent[]>("/api/agent")
      return agents.filter((agent) => !agent.hidden).map(projectAgent)
    }, "Failed to load agents"),
}

export const findApi = {
  files: (options: { query: { query: string; limit?: number } }) =>
    wrap<string[]>(async () => {
      const query = options.query.query
      const limit = options.query.limit ?? 20
      const files = await apiData<{ path: string; type?: string }[]>(
        `/api/fs/find?query=${encodeURIComponent(query)}&limit=${limit}`
      )
      return files.map((file) => file.path)
    }, "Failed to search files"),

  symbols: (_options: { query: { query: string } }) =>
    wrap<string[]>(async () => [], "Symbol search is not supported by opencode v2"),
}

export const pathApi = {
  get: () =>
    wrap(async () => {
      const location = await apiData<{ directory: string; project?: { canonical: string } }>("/api/location")
      return {
        state: "",
        config: "",
        worktree: location.project?.canonical ?? location.directory,
        directory: location.directory,
      }
    }, "Failed to load paths"),
}

export const projectApi = {
  current: () =>
    wrap(async () => {
      const location = await apiData<{ directory: string; project?: { id: string; canonical: string } }>("/api/location")
      return { id: location.project?.id ?? "", worktree: location.project?.canonical ?? location.directory }
    }, "Failed to load project"),
}

export const commandApi = {
  list: () =>
    wrap<Command[]>(async () => {
      const commands = await apiData<V2Command[]>("/api/command")
      return commands.map(projectCommand)
    }, "Failed to load commands"),
}

export const permissionApi = {
  respond: (options: { path: { requestID: string }; body: { reply: "once" | "always" | "reject"; message?: string } }) =>
    wrap<boolean>(async () => {
      const requestID = options.path.requestID
      const sessionID = permissionSessions.get(requestID)
      if (!sessionID) throw new Error("Unknown permission request: " + requestID)
      const decision = options.body.reply === "reject" ? "reject" : options.body.reply === "always" ? "always" : "once"
      await apiData(
        `/api/session/${sessionID}/permission/${requestID}/reply`,
        jsonInit("POST", { decision, message: options.body.message })
      )
      forgetPermission(requestID)
      return true
    }, "Failed to respond to permission"),
}

export const questionApi = {
  reply: (options: { requestID: string; answers: string[][] }) =>
    wrap<boolean>(async () => {
      const requestID = options.requestID
      const sessionID = formSessions.get(requestID)
      if (!sessionID) throw new Error("Unknown form request: " + requestID)
      const flat = options.answers.flat()
      await apiData(
        `/api/session/${sessionID}/form/${requestID}/reply`,
        jsonInit("POST", { answer: { value: flat } })
      )
      forgetForm(requestID)
      return true
    }, "Failed to reply to question"),

  reject: (options: { requestID: string }) =>
    wrap<boolean>(async () => {
      const requestID = options.requestID
      const sessionID = formSessions.get(requestID)
      if (!sessionID) throw new Error("Unknown form request: " + requestID)
      await apiData(`/api/session/${sessionID}/form/${requestID}`, { method: "DELETE" })
      forgetForm(requestID)
      return true
    }, "Failed to reject question"),
}

/**
 * Credential handling. These methods return raw values (no `{ data, error }`
 * envelope) because the settings UI consumes them directly.
 */
export const authApi = {
  list: async (): Promise<Record<string, unknown>> => {
    const integrations = await apiData<unknown[]>("/api/integration")
    return Object.fromEntries(
      (integrations as Record<string, unknown>[]).map((integration) => [String(integration.id), integration])
    )
  },

  methods: async (provider: string) => {
    const integration = await apiData<Record<string, unknown>>(`/api/integration/${provider}`)
    const methods = Array.isArray(integration.methods) ? (integration.methods as Record<string, unknown>[]) : []
    return methods.map((method) => ({
      label: String(method.label ?? method.id ?? ""),
      type: method.type === "oauth" ? ("oauth" as const) : ("api" as const),
      prompts: method.prompts,
    }))
  },

  set: async (provider: string, value: unknown): Promise<void> => {
    const key = typeof value === "string" ? value : String((value as Record<string, unknown>)?.key ?? "")
    await apiData(`/api/integration/${provider}/connect/key`, jsonInit("POST", { key }))
  },

  remove: async (provider: string): Promise<void> => {
    await apiData(`/api/credential/${provider}`, { method: "DELETE" })
  },

  start: async (
    provider: string,
    methodIndex: number,
    inputs: unknown
  ): Promise<{ id: string; url?: string; method: "auto" | "code"; instructions?: string }> => {
    const integration = await apiData<Record<string, unknown>>(`/api/integration/${provider}`)
    const methods = Array.isArray(integration.methods) ? (integration.methods as Record<string, unknown>[]) : []
    const method = methods[methodIndex]
    const methodID = String(method?.id ?? "")
    const answer = inputs as Record<string, unknown>

    if (method?.type === "oauth") {
      const attempt = await apiData<{ attemptID?: string; id?: string; url?: string; instructions?: string }>(
        `/api/integration/${provider}/connect/oauth`,
        jsonInit("POST", { methodID, answer })
      )
      return {
        id: attempt.attemptID ?? attempt.id ?? "",
        url: attempt.url,
        method: "auto",
        instructions: attempt.instructions,
      }
    }

    await apiData(`/api/integration/${provider}/connect/key`, jsonInit("POST", { key: answer?.key ?? "", answer }))
    return { id: methodID, method: "auto" }
  },

  submit: async (id: string, code: string): Promise<boolean> => {
    await apiData(`/api/integration/${id}/connect/oauth/${id}/complete`, jsonInit("POST", { code }))
    return true
  },

  status: async (id: string): Promise<{ status: "pending" | "success" | "failed"; result?: Record<string, unknown> }> => {
    const status = await apiData<{ status?: string; result?: Record<string, unknown> }>(`/api/integration/${id}/connect/oauth/${id}`)
    return { status: (status.status ?? "pending") as "pending" | "success" | "failed", result: status.result }
  },
}

export const v2Api = {
  session: sessionApi,
  config: configApi,
  app: appApi,
  find: findApi,
  path: pathApi,
  project: projectApi,
  command: commandApi,
  permissions: permissionApi,
  question: questionApi,
  auth: authApi,
}

export { apiFetch, apiData, jsonInit }
