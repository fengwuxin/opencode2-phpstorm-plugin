/**
 * Subset of the opencode v2 data model used by the web UI.
 * Derived from the server OpenAPI document (`/openapi.json`).
 */

export type V2ModelRef = {
  id: string
  providerID: string
  variant?: string
}

export type V2TokenUsage = {
  input: number
  output: number
  reasoning?: number
  cache?: { read: number; write: number }
}

export type V2Session = {
  id: string
  parentID?: string
  projectID?: string
  agent?: string
  model?: V2ModelRef
  cost?: number
  tokens?: V2TokenUsage
  outcome?: "succeeded" | "failed" | "interrupted"
  title?: string
  subpath?: string
  time: { created: number; updated?: number; idle?: number; viewed?: number; archived?: number }
  location?: { directory: string }
  revert?: { messageID?: string; files?: unknown[] }
  metadata?: Record<string, unknown>
}

export type V2ToolState =
  | { status: "streaming"; input: string }
  | { status: "running"; input: Record<string, unknown>; metadata?: Record<string, unknown> }
  | {
      status: "completed"
      input: Record<string, unknown>
      content?: V2ToolContent[]
      metadata?: Record<string, unknown>
    }
  | {
      status: "error"
      input: Record<string, unknown>
      error?: { message?: string; name?: string }
      content?: V2ToolContent[]
      metadata?: Record<string, unknown>
    }

export type V2ToolContent = {
  type: string
  text?: string
  [key: string]: unknown
}

export type V2TextBlock = { type: "text"; text: string }
export type V2ReasoningBlock = { type: "reasoning"; text: string; time?: { created?: number; completed?: number } }
export type V2ToolBlock = {
  type: "tool"
  id: string
  name: string
  executed?: boolean
  state?: V2ToolState
  time?: { created?: number; ran?: number; completed?: number }
}
export type V2ContentBlock = V2TextBlock | V2ReasoningBlock | V2ToolBlock

export type V2AssistantMessage = {
  id: string
  type: "assistant"
  time: { created: number; streamed?: number; completed?: number }
  agent?: string
  model?: V2ModelRef
  content?: V2ContentBlock[]
  cost?: number
  tokens?: V2TokenUsage
  error?: { message?: string; name?: string }
}

export type V2UserMessage = {
  id: string
  type: "user"
  time: { created: number }
  text: string
  files?: { mime?: string; filename?: string; url?: string; source?: unknown }[]
  agents?: { name: string }[]
  skills?: { name: string }[]
}

export type V2ShellMessage = {
  id: string
  type: "shell"
  time: { created: number; completed?: number }
  shellID?: string
  command: string
  status?: "running" | "exited" | "timeout" | "killed"
  exit?: number
  output?: { output?: string; truncated?: boolean }
}

export type V2SyntheticMessage = {
  id: string
  type: "synthetic" | "system" | "compaction" | "idle" | "skill" | string
  time?: { created: number }
  text?: string
  [key: string]: unknown
}

export type V2Message = V2AssistantMessage | V2UserMessage | V2ShellMessage | V2SyntheticMessage

export type V2Agent = {
  id: string
  name?: string
  description?: string
  mode?: string
  hidden?: boolean
  model?: V2ModelRef
  variant?: string
  [key: string]: unknown
}

export type V2Model = {
  id: string
  modelID?: string
  providerID: string
  name?: string
  family?: string
  capabilities?: { tools?: boolean; input?: string[]; output?: string[] }
  variants?: { id: string; settings?: Record<string, unknown> }[]
  [key: string]: unknown
}

export type V2Provider = {
  id: string
  name?: string
  integrationID?: string
  activation?: string
  [key: string]: unknown
}

/**
 * Config fields the settings panel edits, using the names opencode v2 returns from
 * `GET /api/config` (v1 names such as autoupdate/snapshot/plugin were renamed to
 * update/snapshots/plugins).
 */
export type V2SettingsConfig = {
  username?: string
  update?: "disable" | "notify" | "auto"
  snapshots?: boolean
  share?: "manual" | "auto" | "disabled"
  watcher?: { ignore?: string[] }
  plugins?: string[]
  model?: string
  small_model?: string
  disabled_providers?: string[]
}

export type V2Command = { name: string; description?: string }

export type V2FileDiff = {
  path?: string
  file?: string
  additions?: number
  deletions?: number
  patch?: string
  before?: string
  after?: string
  status?: string
  [key: string]: unknown
}

export type V2PermissionRequest = {
  id: string
  sessionID?: string
  permission?: string
  patterns?: string[]
  metadata?: Record<string, unknown>
  tool?: { messageID?: string; callID?: string }
  [key: string]: unknown
}

export type V2FormRequest = {
  id: string
  sessionID?: string
  [key: string]: unknown
}

export type V2Event<T = Record<string, unknown>> = {
  id: string
  type: string
  created?: number
  location?: { directory?: string }
  data?: T
  durable?: { aggregateID?: string; seq?: number; version?: number }
}

export type V2Location = {
  directory: string
  project?: { id: string; directory: string; canonical: string }
}
