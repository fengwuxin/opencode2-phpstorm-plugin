/**
 * Projection from the opencode v2 data model onto the legacy (v1 shaped) model
 * that the existing web UI components consume.
 *
 * The UI renders `{ info, parts }` messages where `parts` follow the classic
 * text / reasoning / tool / file shape, so the whole view layer can stay untouched.
 */

import type { Agent, Command, Config, FileDiff, Provider, Session } from "@opencode-ai/sdk/client"
import type { Message as LegacyMessage, Part as LegacyPart, WebguiPart } from "../../../types/messages"
import type {
  V2Agent,
  V2AssistantMessage,
  V2Command,
  V2ContentBlock,
  V2FileDiff,
  V2Message,
  V2Model,
  V2Provider,
  V2Session,
  V2ShellMessage,
  V2ToolBlock,
  V2UserMessage,
} from "./types"

const UNKNOWN_SESSION = ""

/** Stable id for a text/reasoning block: the ordinal is its index in the content array. */
function blockPartID(messageID: string, ordinal: number): string {
  return `${messageID}:${ordinal}`
}

function textOfContent(content: unknown): string {
  if (!Array.isArray(content)) return ""
  return content
    .map((item) => {
      if (item && typeof item === "object" && "text" in item && typeof (item as { text?: unknown }).text === "string") {
        return (item as { text: string }).text
      }
      return ""
    })
    .filter((value) => value.length > 0)
    .join("\n")
}

/** Maps a v2 tool block onto a classic tool part. */
export function toolBlockToPart(block: V2ToolBlock, messageID: string, sessionID: string): LegacyPart {
  const state = block.state
  const status =
    state?.status === "completed"
      ? "completed"
      : state?.status === "error"
        ? "error"
        : state?.status === "running" || state?.status === "streaming"
          ? "running"
          : "pending"

  const input = state && "input" in state ? state.input : {}
  const output = state && "content" in state ? textOfContent(state.content) : ""
  const errorMessage =
    state && state.status === "error" && state.error && typeof state.error === "object" && "message" in state.error
      ? String((state.error as { message?: unknown }).message ?? "")
      : undefined

  // The UI refreshes files in the IDE based on `state.input.filePath`; opencode v2 tools
  // report the target as `path`, so it is mirrored here.
  const normalizedInput =
    input && typeof input === "object" && !Array.isArray(input) ? { ...(input as Record<string, unknown>) } : input
  if (
    normalizedInput &&
    typeof normalizedInput === "object" &&
    !Array.isArray(normalizedInput) &&
    "path" in normalizedInput &&
    !("filePath" in normalizedInput)
  ) {
    ;(normalizedInput as Record<string, unknown>).filePath = (normalizedInput as Record<string, unknown>).path
  }

  return {
    id: block.id,
    callID: block.id,
    messageID,
    sessionID,
    type: "tool",
    tool: block.name,
    state: {
      status,
      input: typeof input === "string" ? input : (input as Record<string, unknown>),
      output: status === "error" ? (errorMessage ?? output) : output,
      metadata: state && "metadata" in state ? state.metadata : undefined,
      time: {
        start: block.time?.created ?? block.time?.ran ?? 0,
        end: block.time?.completed,
      },
    },
  } as unknown as LegacyPart
}

function contentBlockToPart(
  block: V2ContentBlock,
  ordinal: number,
  messageID: string,
  sessionID: string
): WebguiPart | null {
  if (block.type === "text") {
    return {
      id: blockPartID(messageID, ordinal),
      messageID,
      sessionID,
      type: "text",
      text: block.text,
    } as unknown as WebguiPart
  }

  if (block.type === "reasoning") {
    return {
      id: blockPartID(messageID, ordinal),
      messageID,
      sessionID,
      type: "reasoning",
      text: block.text,
      time: {
        start: block.time?.created ?? 0,
        end: block.time?.completed,
      },
    } as unknown as WebguiPart
  }

  if (block.type === "tool") {
    return toolBlockToPart(block, messageID, sessionID) as unknown as WebguiPart
  }

  return null
}

/** Converts a v2 assistant message into the classic `{ info, parts }` shape. */
function projectAssistant(message: V2AssistantMessage, sessionID: string): LegacyMessage {
  const parts: WebguiPart[] = []
  ;(message.content ?? []).forEach((block, ordinal) => {
    const part = contentBlockToPart(block, ordinal, message.id, sessionID)
    if (part) parts.push(part)
  })

  const info = {
    id: message.id,
    sessionID,
    role: "assistant",
    time: {
      created: message.time?.created ?? 0,
      completed: message.time?.completed,
    },
    agent: message.agent,
    modelID: message.model?.id,
    providerID: message.model?.providerID,
    cost: message.cost ?? 0,
    tokens: message.tokens,
    error: message.error,
    path: { cwd: "", root: "" },
    mode: message.agent ?? "",
    parentID: "",
  }

  return { info, parts } as unknown as LegacyMessage
}

/** Converts a v2 user message into the classic `{ info, parts }` shape. */
function projectUser(message: V2UserMessage, sessionID: string): LegacyMessage {
  const parts: WebguiPart[] = [
    {
      id: `${message.id}:text`,
      messageID: message.id,
      sessionID,
      type: "text",
      text: message.text,
    } as unknown as WebguiPart,
  ]

  ;(message.files ?? []).forEach((file, index) => {
    parts.push({
      id: `${message.id}:file:${index}`,
      messageID: message.id,
      sessionID,
      type: "file",
      mime: file.mime ?? "",
      filename: file.filename ?? "",
      url: file.url ?? "",
    } as unknown as WebguiPart)
  })

  const info = {
    id: message.id,
    sessionID,
    role: "user",
    time: { created: message.time?.created ?? 0 },
    agent: message.agents?.[0]?.name,
    modelID: undefined,
    providerID: undefined,
    cost: 0,
    path: { cwd: "", root: "" },
  }

  return { info, parts } as unknown as LegacyMessage
}

/** Converts a v2 shell message into an assistant message holding a shell tool part. */
function projectShell(message: V2ShellMessage, sessionID: string): LegacyMessage {
  const toolPart = {
    id: message.shellID ?? message.id,
    callID: message.shellID ?? message.id,
    messageID: message.id,
    sessionID,
    type: "tool",
    tool: "shell",
    state: {
      status: message.status === "running" ? "running" : "completed",
      input: { command: message.command },
      output: message.output?.output ?? "",
      metadata: { exit: message.exit },
      time: { start: message.time?.created ?? 0, end: message.time?.completed },
    },
  } as unknown as WebguiPart

  const info = {
    id: message.id,
    sessionID,
    role: "assistant",
    time: { created: message.time?.created ?? 0, completed: message.time?.completed },
    cost: 0,
    path: { cwd: "", root: "" },
  }

  return { info, parts: [toolPart] } as unknown as LegacyMessage
}

/** Converts any v2 message into the classic `{ info, parts }` shape. */
export function projectMessage(message: V2Message, sessionID: string): LegacyMessage | null {
  const id = sessionID || UNKNOWN_SESSION

  if (message.type === "assistant") return projectAssistant(message as V2AssistantMessage, id)
  if (message.type === "user") return projectUser(message as V2UserMessage, id)
  if (message.type === "shell") return projectShell(message as V2ShellMessage, id)

  // synthetic/system/compaction/idle/skill messages are not rendered as chat messages
  return null
}

/** Converts a v2 session into the legacy session shape used by the UI. */
export function projectSession(session: V2Session): Session {
  return {
    id: session.id,
    projectID: session.projectID ?? "",
    directory: session.location?.directory ?? "",
    parentID: session.parentID,
    title: session.title ?? "",
    version: "2",
    time: {
      created: session.time?.created ?? 0,
      updated: session.time?.updated ?? session.time?.created ?? 0,
      archived: session.time?.archived,
    },
    revert: session.revert
      ? { messageID: session.revert.messageID ?? "", files: session.revert.files }
      : undefined,
  } as unknown as Session
}

/** Converts a v2 diff entry into the legacy FileDiff shape. */
export function projectDiff(diff: V2FileDiff): FileDiff {
  return {
    file: diff.file ?? diff.path ?? "",
    additions: diff.additions ?? 0,
    deletions: diff.deletions ?? 0,
    patch: diff.patch ?? "",
    before: diff.before,
    after: diff.after,
    status: diff.status,
  } as unknown as FileDiff
}

/** Converts a v2 agent into the legacy agent shape. */
export function projectAgent(agent: V2Agent): Agent {
  return {
    name: agent.id,
    description: agent.description ?? "",
    mode: agent.mode ?? "primary",
    builtIn: false,
    tools: {},
    options: {},
    permission: {},
  } as unknown as Agent
}

/** Converts a v2 command into the legacy command shape. */
export function projectCommand(command: V2Command): Command {
  return {
    name: command.name,
    description: command.description ?? "",
    agent: undefined,
    model: undefined,
    template: "",
  } as unknown as Command
}

/** Converts a v2 provider (plus its models) into the legacy provider shape. */
export function projectProvider(provider: V2Provider, models: V2Model[]): Provider {
  const owned: Record<string, unknown> = {}
  for (const model of models) {
    if (model.providerID !== provider.id) continue
    if (model.enabled === false) continue
    owned[model.id] = {
      id: model.id,
      name: model.name ?? model.id,
      providerID: model.providerID,
      family: model.family,
      // The legacy UI filters by `release_date`; v2 reports it as a unix timestamp.
      release_date: model.time?.released != null ? new Date(model.time.released).toISOString() : model.release_date,
      status: model.status,
      capabilities: model.capabilities,
      variants: model.variants,
      options: model.settings,
      limit: model.limit,
      cost: model.cost,
    }
  }

  return {
    id: provider.id,
    name: provider.name ?? provider.id,
    source: "config",
    env: [],
    options: {},
    models: owned,
  } as unknown as Provider
}

/** Builds a legacy config object out of the v2 config documents. */
export function projectConfig(documents: unknown): Config {
  const list = Array.isArray(documents) ? (documents as Record<string, unknown>[]) : []
  const merged: Record<string, unknown> = {}
  for (const document of list) {
    const info = document.info
    if (info && typeof info === "object") Object.assign(merged, info as Record<string, unknown>)
  }
  return merged as unknown as Config
}
