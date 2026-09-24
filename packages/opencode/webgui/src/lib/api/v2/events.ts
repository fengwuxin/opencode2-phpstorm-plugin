/**
 * opencode v2 event stream (`GET /api/event`) translated into the event shapes the
 * web UI consumes.
 *
 * The v2 server emits granular deltas (`session.text.delta`, `session.tool.success`, ...)
 * addressed by message id and content ordinal. This module keeps a small projection
 * cache and re-emits classic `message.updated` / `message.part.updated` events.
 */

import type { ServerEvent } from "../events"
import { apiBase, apiFetch } from "./client"
import { projectSession, toolBlockToPart } from "./project"
import { rememberForm, rememberPermission, forgetForm, forgetPermission } from "./facade"
import type { V2Event, V2ToolBlock } from "./types"

type Emit = (event: ServerEvent) => void

type ToolAccumulator = {
  messageID: string
  sessionID: string
  name: string
  status: "pending" | "running" | "completed" | "error"
  input: unknown
  output: string
  metadata?: Record<string, unknown>
  start: number
  end?: number
}

function textFromContent(content: unknown): string {
  if (!Array.isArray(content)) return ""
  return content
    .map((item) =>
      item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string"
        ? (item as { text: string }).text
        : ""
    )
    .filter((value) => value.length > 0)
    .join("\n")
}

function safeParseJSON(value: unknown): unknown {
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export class V2EventStream {
  private controller: AbortController | null = null
  private running = false
  private messageTimes = new Map<string, { created: number; completed?: number }>()
  private tools = new Map<string, ToolAccumulator>()
  private textParts = new Map<string, { sessionID: string; messageID: string; type: "text" | "reasoning"; text: string }>()
  private readonly emit: Emit

  constructor(emit: Emit) {
    this.emit = emit
  }

  start() {
    if (this.running) return
    this.running = true
    void this.loop()
  }

  stop() {
    this.running = false
    this.controller?.abort()
    this.controller = null
  }

  private async loop() {
    while (this.running) {
      try {
        await this.consume()
      } catch (error) {
        if (!this.running) return
        console.warn("[v2 events] stream error, reconnecting", error)
      }
      if (!this.running) return
      this.emit({ type: "server.heartbeat", properties: {} } as ServerEvent)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  private async consume() {
    this.controller = new AbortController()
    const response = await apiFetch("/api/event", {
      headers: { Accept: "text/event-stream" },
      signal: this.controller.signal,
    })
    if (!response.ok || !response.body) {
      throw new Error(`event stream failed: HTTP ${response.status}`)
    }

    this.emit({ type: "server.connected", properties: {} } as ServerEvent)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (this.running) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let separator = buffer.indexOf("\n\n")
      while (separator >= 0) {
        const frame = buffer.slice(0, separator)
        buffer = buffer.slice(separator + 2)
        this.handleFrame(frame)
        separator = buffer.indexOf("\n\n")
      }
    }
  }

  private handleFrame(frame: string) {
    for (const line of frame.split("\n")) {
      if (!line.startsWith("data:")) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      try {
        this.handleEvent(JSON.parse(payload) as V2Event)
      } catch (error) {
        console.warn("[v2 events] failed to parse event", error, payload.slice(0, 200))
      }
    }
  }

  private handleEvent(event: V2Event) {
    const data = (event.data ?? {}) as Record<string, unknown>
    const sessionID = typeof data.sessionID === "string" ? data.sessionID : undefined

    switch (event.type) {
      case "server.connected":
        this.emit({ type: "server.connected", properties: {} } as ServerEvent)
        return

      case "session.created":
      case "session.updated":
      case "session.renamed":
      case "session.moved": {
        if (!sessionID) return
        this.emit({
          type: event.type === "session.created" ? "session.created" : "session.updated",
          properties: { sessionID, info: projectSession(data as never) },
        } as ServerEvent)
        return
      }

      case "session.deleted": {
        if (!sessionID) return
        this.emit({ type: "session.deleted", properties: { sessionID } } as ServerEvent)
        return
      }

      case "session.idle":
      case "session.execution.succeeded":
      case "session.execution.failed":
      case "session.execution.interrupted": {
        if (!sessionID) return
        this.emit({ type: "session.idle", properties: { sessionID } } as ServerEvent)
        return
      }

      case "session.execution.started": {
        if (!sessionID) return
        this.emit({
          type: "session.status",
          properties: { sessionID, status: { type: "busy", attempt: 0, message: "", next: 0 } },
        } as ServerEvent)
        return
      }

      case "session.error": {
        if (!sessionID) return
        this.emit({ type: "session.error", properties: { sessionID, error: data.error ?? data } } as ServerEvent)
        return
      }

      case "session.compacted":
      case "session.compaction.ended": {
        if (!sessionID) return
        this.emit({ type: "session.compacted", properties: { sessionID } } as ServerEvent)
        return
      }

      case "session.diff": {
        if (!sessionID) return
        this.emit({ type: "session.diff", properties: { sessionID, diff: data.diff ?? [] } } as ServerEvent)
        return
      }

      case "session.step.started": {
        const messageID = String(data.assistantMessageID ?? "")
        if (!sessionID || !messageID) return
        const started = Number(data.started ?? Date.now())
        this.messageTimes.set(messageID, { created: started })
        const model = data.model as { id?: string; providerID?: string } | undefined
        this.emit({
          type: "message.updated",
          properties: {
            sessionID,
            info: {
              id: messageID,
              sessionID,
              role: "assistant",
              time: { created: started },
              agent: data.agent,
              modelID: model?.id,
              providerID: model?.providerID,
              cost: 0,
              path: { cwd: "", root: "" },
            },
          },
        } as ServerEvent)
        return
      }

      case "session.step.ended": {
        const messageID = String(data.assistantMessageID ?? "")
        if (!sessionID || !messageID) return
        const time = this.messageTimes.get(messageID) ?? { created: Date.now() }
        time.completed = Date.now()
        this.messageTimes.set(messageID, time)
        this.emit({
          type: "message.updated",
          properties: {
            sessionID,
            info: {
              id: messageID,
              sessionID,
              role: "assistant",
              time,
              cost: data.cost ?? 0,
              tokens: data.tokens,
              path: { cwd: "", root: "" },
            },
          },
        } as ServerEvent)
        return
      }

      case "session.text.started":
      case "session.reasoning.started": {
        const messageID = String(data.assistantMessageID ?? "")
        const ordinal = Number(data.ordinal ?? 0)
        if (!sessionID || !messageID) return
        const type = event.type === "session.text.started" ? "text" : "reasoning"
        const id = `${messageID}:${ordinal}`
        this.textParts.set(id, { sessionID, messageID, type, text: "" })
        this.emit({
          type: "message.part.updated",
          properties: {
            sessionID,
            part: { id, messageID, sessionID, type, text: "" },
          },
        } as ServerEvent)
        return
      }

      case "session.text.delta":
      case "session.reasoning.delta": {
        const messageID = String(data.assistantMessageID ?? "")
        const ordinal = Number(data.ordinal ?? 0)
        const delta = String(data.delta ?? "")
        if (!sessionID || !messageID || !delta) return
        const type = event.type === "session.text.delta" ? "text" : "reasoning"
        const id = `${messageID}:${ordinal}`
        const current = this.textParts.get(id) ?? { sessionID, messageID, type, text: "" }
        current.text += delta
        this.textParts.set(id, current)
        // Only the delta event is emitted here: `message.part.updated` with a delta
        // would append the same chunk twice.
        this.emit({
          type: "message.part.delta",
          properties: { sessionID, messageID, partID: id, field: "text", delta },
        } as ServerEvent)
        return
      }

      case "session.text.ended":
      case "session.reasoning.ended": {
        const messageID = String(data.assistantMessageID ?? "")
        const ordinal = Number(data.ordinal ?? 0)
        if (!sessionID || !messageID) return
        const type = event.type === "session.text.ended" ? "text" : "reasoning"
        const id = `${messageID}:${ordinal}`
        const current = this.textParts.get(id)
        const text = typeof data.text === "string" && data.text.length > 0 ? data.text : (current?.text ?? "")
        this.textParts.set(id, { sessionID, messageID, type, text })
        this.emit({
          type: "message.part.updated",
          properties: {
            sessionID,
            part: { id, messageID, sessionID, type, text, time: { start: 0, end: Date.now() } },
          },
        } as ServerEvent)
        return
      }

      case "session.tool.input.started": {
        const messageID = String(data.assistantMessageID ?? "")
        const id = String(data.id ?? "")
        if (!sessionID || !messageID || !id) return
        this.tools.set(id, {
          messageID,
          sessionID,
          name: String(data.name ?? "tool"),
          status: "pending",
          input: {},
          output: "",
          start: Date.now(),
        })
        this.emitTool(id)
        return
      }

      case "session.tool.input.ended": {
        const id = String(data.id ?? "")
        const tool = this.tools.get(id)
        if (!tool) return
        tool.input = safeParseJSON(data.text)
        this.emitTool(id)
        return
      }

      case "session.tool.called": {
        const id = String(data.id ?? "")
        const tool = this.tools.get(id)
        if (!tool) return
        tool.status = "running"
        if (data.input !== undefined) tool.input = data.input
        this.emitTool(id)
        return
      }

      case "session.tool.progress": {
        const id = String(data.id ?? "")
        const tool = this.tools.get(id)
        if (!tool) return
        if (data.metadata && typeof data.metadata === "object") {
          tool.metadata = { ...(tool.metadata ?? {}), ...(data.metadata as Record<string, unknown>) }
        }
        this.emitTool(id)
        return
      }

      case "session.tool.success": {
        const id = String(data.id ?? "")
        const tool = this.tools.get(id)
        if (!tool) return
        tool.status = "completed"
        tool.output = textFromContent(data.content)
        if (data.metadata && typeof data.metadata === "object") {
          tool.metadata = { ...(tool.metadata ?? {}), ...(data.metadata as Record<string, unknown>) }
        }
        tool.end = Date.now()
        this.emitTool(id)
        return
      }

      case "session.tool.failed": {
        const id = String(data.id ?? "")
        const tool = this.tools.get(id)
        if (!tool) return
        tool.status = "error"
        const error = data.error as { message?: string } | undefined
        tool.output = error?.message ?? textFromContent(data.content)
        tool.end = Date.now()
        this.emitTool(id)
        return
      }

      case "session.inbox.enqueued": {
        // The user message is only announced through the inbox; opencode v2 does not
        // emit a message.updated event for it.
        const item = (data.item ?? {}) as Record<string, unknown>
        const inboxID = String(data.inboxID ?? "")
        if (!sessionID || !inboxID || item.type !== "user") return
        const payload = (item.payload ?? {}) as Record<string, unknown>
        const text = typeof payload.text === "string" ? payload.text : ""
        const files = Array.isArray(payload.files) ? (payload.files as Record<string, unknown>[]) : []
        const created = typeof event.created === "number" ? event.created : Date.now()

        this.emit({
          type: "message.updated",
          properties: {
            sessionID,
            info: {
              id: inboxID,
              sessionID,
              role: "user",
              time: { created },
              cost: 0,
              path: { cwd: "", root: "" },
            },
          },
        } as ServerEvent)

        const parts: Record<string, unknown>[] = [
          { id: `${inboxID}:text`, messageID: inboxID, sessionID, type: "text", text },
        ]
        files.forEach((file, index) => {
          parts.push({
            id: `${inboxID}:file:${index}`,
            messageID: inboxID,
            sessionID,
            type: "file",
            mime: typeof file.mime === "string" ? file.mime : "",
            filename: typeof file.name === "string" ? file.name : "",
            url: typeof file.uri === "string" ? file.uri : "",
          })
        })
        for (const part of parts) {
          this.emit({ type: "message.part.updated", properties: { sessionID, part } } as ServerEvent)
        }
        return
      }

      case "session.inbox.cancelled": {
        const inboxID = String(data.inboxID ?? "")
        if (!sessionID || !inboxID) return
        this.emit({ type: "message.removed", properties: { sessionID, messageID: inboxID } } as ServerEvent)
        return
      }

      case "permission.asked": {
        const request = (data.request ?? data) as Record<string, unknown>
        const id = String(request.id ?? data.id ?? data.requestID ?? "")
        const requestSessionID = String(request.sessionID ?? sessionID ?? "")
        if (!id || !requestSessionID) return
        rememberPermission(id, requestSessionID)
        const source = request.source as { messageID?: string; id?: string } | undefined
        this.emit({
          type: "permission.asked",
          properties: {
            id,
            sessionID: requestSessionID,
            permission: String(request.action ?? request.permission ?? ""),
            patterns: Array.isArray(request.resources) ? request.resources : [],
            metadata: request.metadata ?? {},
            always: Array.isArray(request.save) ? request.save : [],
            tool: source ? { messageID: source.messageID, callID: source.id } : request.tool,
          },
        } as ServerEvent)
        return
      }

      case "permission.replied":
      case "permission.rejected": {
        const id = String(data.id ?? data.requestID ?? "")
        if (!sessionID || !id) return
        forgetPermission(id)
        this.emit({
          type: "permission.replied",
          properties: { sessionID, requestID: id, response: data.decision ?? data.response },
        } as ServerEvent)
        return
      }

      case "form.created": {
        const form = (data.form ?? data) as Record<string, unknown>
        const id = String(form.id ?? "")
        const formSessionID = String(form.sessionID ?? sessionID ?? "")
        if (!id) return
        rememberForm(id, formSessionID)
        this.emit({
          type: "question.asked",
          properties: {
            id,
            sessionID: formSessionID,
            questions: projectFormQuestions(form),
          },
        } as ServerEvent)
        return
      }

      case "form.replied": {
        const id = String(data.id ?? data.formID ?? "")
        const formSessionID = String(data.sessionID ?? sessionID ?? "")
        if (!id) return
        forgetForm(id)
        this.emit({
          type: "question.replied",
          properties: { sessionID: formSessionID, requestID: id, answers: [] },
        } as ServerEvent)
        return
      }

      case "form.cancelled": {
        const id = String(data.id ?? data.formID ?? "")
        const formSessionID = String(data.sessionID ?? sessionID ?? "")
        if (!id) return
        forgetForm(id)
        this.emit({
          type: "question.rejected",
          properties: { sessionID: formSessionID, requestID: id },
        } as ServerEvent)
        return
      }

      case "file.edited": {
        this.emit({ type: "file.edited", properties: data } as ServerEvent)
        return
      }

      case "todo.updated": {
        this.emit({ type: "todo.updated", properties: data } as ServerEvent)
        return
      }

      case "lsp.updated": {
        this.emit({ type: "lsp.diagnostics", properties: data } as ServerEvent)
        return
      }

      case "installation.updated": {
        this.emit({ type: "installation.updated", properties: data } as ServerEvent)
        return
      }

      default:
        return
    }
  }

  private emitTool(id: string) {
    const tool = this.tools.get(id)
    if (!tool) return
    const block: V2ToolBlock = {
      type: "tool",
      id,
      name: tool.name,
      state:
        tool.status === "completed"
          ? { status: "completed", input: (tool.input ?? {}) as Record<string, unknown>, metadata: tool.metadata }
          : tool.status === "error"
            ? { status: "error", input: (tool.input ?? {}) as Record<string, unknown>, error: { message: tool.output } }
            : { status: "running", input: (tool.input ?? {}) as Record<string, unknown>, metadata: tool.metadata },
      time: { created: tool.start, completed: tool.end },
    }
    const part = toolBlockToPart(block, tool.messageID, tool.sessionID)
    const withOutput = { ...part, state: { ...(part as unknown as { state: Record<string, unknown> }).state, output: tool.output } }
    this.emit({
      type: "message.part.updated",
      properties: { sessionID: tool.sessionID, part: withOutput },
    } as ServerEvent)
  }
}

/** Projects a v2 form onto the classic question shape. */
function projectFormQuestions(form: Record<string, unknown>) {
  const fields = Array.isArray(form.fields) ? (form.fields as Record<string, unknown>[]) : []
  if (fields.length === 0) {
    return [
      {
        question: String(form.title ?? "Input required"),
        header: String(form.title ?? "Input").slice(0, 30),
        options: [],
        custom: true,
      },
    ]
  }

  return fields.map((field) => {
    const options = Array.isArray(field.options) ? (field.options as Record<string, unknown>[]) : []
    return {
      question: String(field.label ?? field.title ?? form.title ?? "Input required"),
      header: String(field.label ?? field.name ?? "Input").slice(0, 30),
      options: options.map((option) => ({
        label: String(option.label ?? option.value ?? ""),
        description: option.description ? String(option.description) : undefined,
      })),
      multiple: field.type === "multiselect",
      custom: options.length === 0,
    }
  })
}

export function eventStreamURL(): string {
  return `${apiBase}/api/event`
}
