import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { eventEmitter, useEventHandler, type EventEmitter, type ServerEvent } from "../lib/api/events"
import type { Message, Part, WebguiPart, SDKMessage, QuestionRequest } from "../types/messages"
import type { QuestionAnswer } from "@opencode-ai/sdk/v2/client"
// PermissionRequest type based on new permission system (permission.asked event)
interface PermissionRequest {
  id: string
  sessionID: string
  permission: string
  patterns: string[]
  metadata: Record<string, unknown>
  always: string[]
  tool?: {
    messageID: string
    callID: string
  }
}
import * as Store from "../lib/messagesStore"
import { sdk } from "../lib/api/sdkClient"
import { useSession } from "./SessionContext"
import { reloadPath } from "../lib/ideBridge"

// Re-export types for convenience
export type { Message, Part, WebguiPart, SDKMessage, QuestionRequest, QuestionRequestPart } from "../types/messages"

interface MessagesContextValue {
  messages: Message[]
  addMessage: (message: Message) => void
  addSessionError: (sessionID: string, error: unknown) => void
  updateMessage: (messageID: string, update: Partial<Message>) => void
  removeMessage: (messageID: string) => void
  addPart: (messageID: string, part: WebguiPart) => void
  updatePart: (messageID: string, partID: string, update: Partial<WebguiPart>) => void
  removePart: (messageID: string, partID: string) => void
  clearMessages: () => void
  getMessagesBySession: (sessionID: string) => Message[]
  loadSessionMessages: (sessionID: string) => Promise<void>
  setMessages: (messages: Message[]) => void
  removeSessionErrors: (sessionID: string, afterTimestamp?: number) => void
  // permissions
  permissions: PermissionRequest[]
  getPermissionForCall: (sessionID: string, callID?: string | null) => PermissionRequest | undefined
  respondPermission: (requestID: string, reply: "once" | "always" | "reject") => Promise<boolean>
  // questions
  questions: Map<string, QuestionRequest[]>
  getQuestionsBySession: (sessionID: string) => QuestionRequest[]
  getQuestionForCall: (sessionID: string, callID?: string | null) => QuestionRequest | undefined
  replyQuestion: (requestID: string, answers: QuestionAnswer[]) => Promise<boolean>
  rejectQuestion: (requestID: string) => Promise<boolean>
}

const MessagesContext = createContext<MessagesContextValue | undefined>(undefined)

interface MessagesProviderProps {
  children: ReactNode
  emitter?: EventEmitter | null | undefined
}

function sessionErrorText(error: unknown): string {
  if (!error) return "会话发生错误"
  if (typeof error === "string") return error
  if (typeof error !== "object") return "会话发生错误"

  const data = (error as { data?: { message?: unknown }; message?: unknown }).data
  const dataMessage = data && typeof data.message === "string" ? data.message : undefined
  if (dataMessage) return dataMessage

  const msg = (error as { message?: unknown }).message
  if (typeof msg === "string" && msg.length > 0) return msg

  return "会话发生错误"
}

function sessionErrorKey(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined

  const name = (error as { name?: unknown }).name
  const safeName = typeof name === "string" && name.length > 0 ? name : ""

  // Prefer data.message when present (MessageAbortedError etc.)
  const dataMessage = (error as { data?: { message?: unknown } })?.data?.message
  if (typeof dataMessage === "string" && dataMessage.length > 0) {
    return safeName ? `${safeName}:${dataMessage}` : `:${dataMessage}`
  }

  const msg = (error as { message?: unknown }).message
  if (typeof msg === "string" && msg.length > 0) {
    return safeName ? `${safeName}:${msg}` : `:${msg}`
  }

  return safeName.length > 0 ? `${safeName}:` : undefined
}

function infoSessionErrorKey(info: unknown): string | undefined {
  const error = (info as { error?: unknown })?.error
  return sessionErrorKey(error)
}

export function MessagesProvider({ children }: MessagesProviderProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [permissions, setPermissions] = useState<PermissionRequest[]>([])
  const [questions, setQuestions] = useState<Map<string, QuestionRequest[]>>(new Map())
  const pendingPartTextDeltasRef = useRef<Map<string, string>>(new Map())
  const knownPartsRef = useRef<Map<string, Part>>(new Map())
  const session = useSession()
  const setReasoning = session.setReasoning
  const sourceEmitter = eventEmitter

  // Add or update a message
  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => Store.upsertMessage(prev, message))
  }, [])

  // Add an error message for a session (synthetic message)
  const addSessionError = useCallback((sessionID: string, error: unknown) => {
    const text = sessionErrorText(error)
    const key = sessionErrorKey(error)

    const errorID = `error-${Date.now()}`
    const errorMessage: Message = {
      info: {
        id: errorID,
        sessionID,
        role: "assistant",
        time: {
          created: Date.now(),
          updated: Date.now(),
        },
        syntheticErrorKey: key,
      } as unknown as SDKMessage,
      parts: [
        {
          id: `part-${errorID}`,
          type: "session-error",
          sessionID,
          messageID: errorID,
          message: text,
        } as WebguiPart,
      ],
    }

    setMessages((prev) => {
      const alreadyShownOnMessage =
        key &&
        prev.some((m) => {
          if (m.info.sessionID !== sessionID) return false
          if (m.info.role !== "assistant") return false
          return infoSessionErrorKey(m.info) === key
        })

      if (alreadyShownOnMessage) return prev

      const existingSynthetic =
        key &&
        prev.some((m) => {
          if (m.info.sessionID !== sessionID) return false
          if (!m.info.id.startsWith("error-")) return false
          return (m.info as any)?.syntheticErrorKey === key
        })

      if (existingSynthetic) return prev

      return Store.upsertMessage(prev, errorMessage)
    })
  }, [])

  // Remove session errors for a specific session, optionally after a certain timestamp
  const removeSessionErrors = useCallback((sessionID: string, afterTimestamp?: number) => {
    setMessages((prev) =>
      prev.filter(
        (m) =>
          !(
            m.info.sessionID === sessionID &&
            (m.info.id.startsWith("error-") || m.parts.some((p) => p.type === "session-error")) &&
            (!afterTimestamp || m.info.time.created > afterTimestamp)
          ),
      ),
    )
  }, [])

  // Update a message
  const updateMessage = useCallback((messageID: string, update: Partial<Message>) => {
    setMessages((prev) => Store.updateMessage(prev, messageID, update))
  }, [])

  // Remove a message
  const removeMessage = useCallback((messageID: string) => {
    setMessages((prev) => Store.removeMessage(prev, messageID))
  }, [])

  // Add a part to a message
  const addPart = useCallback((messageID: string, part: WebguiPart) => {
    setMessages((prev) => Store.upsertPart(prev, messageID, part))
  }, [])

  // Update a specific part in a message
  const updatePart = useCallback((messageID: string, partID: string, update: Partial<WebguiPart>) => {
    setMessages((prev) => Store.updatePart(prev, messageID, partID, update))
  }, [])

  // Remove a part from a message
  const removePart = useCallback((messageID: string, partID: string) => {
    setMessages((prev) => Store.removePart(prev, messageID, partID))
  }, [])

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  // Get messages for a specific session
  const getMessagesBySession = useCallback(
    (sessionID: string) => Store.getMessagesBySession(messages, sessionID),
    [messages],
  )

  // Listen to message.updated events (also handles message creation)
  const handleMessageUpdated = useCallback((event: ServerEvent) => {
    if (event.type === "message.updated") {
      const { info, sessionID } = event.properties as { info: SDKMessage; sessionID?: string }
      const nextInfo = info.sessionID ? info : ({ ...info, sessionID } as SDKMessage)
      console.log("[MessagesContext] Message updated:", nextInfo.id, nextInfo.role)

      const key = infoSessionErrorKey(nextInfo)

      // updateMessageInfo creates the message if it doesn't exist
      setMessages((prev) => {
        const next = Store.updateMessageInfo(prev, nextInfo.id, nextInfo)
        if (!key) return next

        // If we later receive a message-level error, remove any synthetic session error we created for it.
        return next.filter((m) => {
          if (m.info.sessionID !== nextInfo.sessionID) return true
          if (!m.info.id.startsWith("error-")) return true
          return (m.info as any)?.syntheticErrorKey !== key
        })
      })
    }
  }, [])

  // Listen to message.part.updated events
  const handlePartUpdated = useCallback(
    (event: ServerEvent) => {
      if (event.type === "message.part.updated") {
        const { part, delta, sessionID } = event.properties as { part: Part; delta?: string; sessionID?: string }
        const nextEventPart = part.sessionID ? part : ({ ...part, sessionID } as Part)
        const pendingDelta = pendingPartTextDeltasRef.current.get(nextEventPart.id)
        const nextPart =
          pendingDelta && "text" in nextEventPart && typeof nextEventPart.text === "string"
            ? ({ ...nextEventPart, text: nextEventPart.text + pendingDelta } as Part)
            : nextEventPart

        if (pendingDelta) {
          pendingPartTextDeltasRef.current.delete(nextEventPart.id)
        }

        knownPartsRef.current.set(nextPart.id, nextPart)

        console.log(
          "[MessagesContext] Part updated:",
          nextPart.id,
          nextPart.type,
          delta ? `(delta: ${delta.length} chars)` : "",
        )

        if (delta && nextPart.type === "text") {
          // Apply delta for streaming text
          setMessages((prev) => Store.applyPartDelta(prev, nextPart.messageID, nextPart, delta))
        } else {
          // No delta, just upsert the part normally
          addPart(nextPart.messageID, nextPart)
        }

        // Reload file in IDE when write/edit/apply_patch tool completes
        if (nextPart.type === "tool") {
          const toolPart = nextPart as { tool?: string; state?: { status?: string; input?: { filePath?: string } } }
          if (
            (toolPart.tool === "write" || toolPart.tool === "edit") &&
            toolPart.state?.status === "completed" &&
            toolPart.state?.input?.filePath
          ) {
            reloadPath(toolPart.state.input.filePath, toolPart.tool)
          }

          if (toolPart.tool === "apply_patch" && toolPart.state?.status === "completed") {
            const patched = (
              toolPart.state as unknown as {
                metadata?: { files?: Array<{ filePath?: string; movePath?: string }> }
              }
            )?.metadata?.files
            if (Array.isArray(patched)) {
              for (const entry of patched) {
                if (entry.filePath) reloadPath(entry.filePath, toolPart.tool)
                if (entry.movePath) reloadPath(entry.movePath, toolPart.tool)
              }
            }
          }
        }

        if (nextPart.type === "reasoning") {
          //const time = (part as { time?: { end?: number } }).time
          //const end = typeof time?.end === 'number'
          setReasoning(nextPart.sessionID, true)
        } else {
          setReasoning(nextPart.sessionID, false)
        }
      }
    },
    [addPart, setReasoning],
  )

  const handlePartDelta = useCallback((event: ServerEvent) => {
    if (event.type !== "message.part.delta") return

    const { messageID, partID, field, delta } = event.properties as {
      sessionID: string
      messageID: string
      partID: string
      field: string
      delta: string
    }

    if (field !== "text" || typeof delta !== "string" || delta.length === 0) return

    const knownPart = knownPartsRef.current.get(partID)
    if (knownPart && knownPart.messageID === messageID) {
      setMessages((prev) => Store.applyPartDelta(prev, messageID, knownPart, delta))
      return
    }

    const hasExistingPart = messages.some(
      (message) =>
        message.info.id === messageID &&
        message.parts.some((part) => part.id === partID && "text" in part && typeof part.text === "string"),
    )

    if (hasExistingPart) {
      setMessages((prev) => Store.appendPartTextDelta(prev, messageID, partID, delta))
      return
    }

    {
      const existing = pendingPartTextDeltasRef.current.get(partID) ?? ""
      pendingPartTextDeltasRef.current.set(partID, existing + delta)
    }
  }, [messages])

  // Listen to session.error events
  const handleSessionError = useCallback(
    (event: ServerEvent) => {
      if (event.type === "session.error") {
        const { sessionID, error } = event.properties as { sessionID: string; error: unknown }
        console.error("[MessagesContext] Session error:", sessionID, error)
        addSessionError(sessionID, error)
      }
    },
    [addSessionError],
  )

  // Listen to message.removed events
  const handleMessageRemoved = useCallback(
    (event: ServerEvent) => {
      if (event.type === "message.removed") {
        const { sessionID, messageID } = event.properties as { sessionID: string; messageID: string }
        console.log("[MessagesContext] Message removed:", messageID)
        removeMessage(messageID)
        setReasoning(sessionID, false)
      }
    },
    [removeMessage, setReasoning],
  )

  // Listen to message.part.removed events
  const handlePartRemoved = useCallback(
    (event: ServerEvent) => {
      if (event.type === "message.part.removed") {
        const { sessionID, messageID, partID } = event.properties as {
          sessionID: string
          messageID: string
          partID: string
        }
        console.log("[MessagesContext] Part removed:", partID)
        removePart(messageID, partID)
        knownPartsRef.current.delete(partID)
        pendingPartTextDeltasRef.current.delete(partID)
        setReasoning(sessionID, false)
      }
    },
    [removePart, setReasoning],
  )

  // Load messages for a session
  const loadSessionMessages = useCallback(async (sessionID: string) => {
    // Skip loading for virtual sessions (not yet persisted to server)
    if (sessionID.startsWith("virtual-")) {
      console.log("[MessagesContext] Skipping load for virtual session:", sessionID)
      return
    }

    console.log("[MessagesContext] Loading messages for session:", sessionID)

    try {
      const response = await sdk.session.messages({ path: { id: sessionID } })

      if (response.error) {
        console.error("[MessagesContext] Failed to load messages:", response.error)
        return
      }

      if (response.data) {
        console.log("[MessagesContext] Messages loaded:", response.data.length)
        // SDK response is already in the correct format: Array<{ info: Message, parts: Array<Part> }>
        // Cast needed because sdk.session.messages returns non-v2 types, but they're structurally identical
        const loadedMessages = response.data as unknown as Message[]

        console.log("[MessagesContext] Loaded messages sample:", loadedMessages[0])

        // Merge the snapshot into local state so an in-flight load does not wipe
        // newer live SSE parts that arrived before the request resolved.
        setMessages((prev) => {
          if (!loadedMessages || loadedMessages.length === 0) return prev
          return Store.mergeSessionMessages(prev, sessionID, loadedMessages)
        })

        try {
          const { currentSession, setIsIdle } = session
          if (currentSession?.id === sessionID) {
            const last = [...loadedMessages].sort((a, b) => a.info.time.created - b.info.time.created).at(-1)
            if (last) {
              const completed = (last.info as any)?.time?.completed
              const isAssistant = (last.info as any)?.role === "assistant"
              const busy = isAssistant && (!completed || completed === 0)
              setIsIdle(!busy)
            }
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error("[MessagesContext] Failed to load messages:", err)
    }
  }, [])

  // Permission events
  const handlePermissionAsked = useCallback((event: ServerEvent) => {
    if (event.type !== "permission.asked") return
    const perm = event.properties as PermissionRequest
    setPermissions((prev) => {
      const exists = prev.some((p) => p.id === perm.id)
      if (exists) return prev.map((p) => (p.id === perm.id ? perm : p))
      return [...prev, perm]
    })
  }, [])

  const handlePermissionReplied = useCallback((event: ServerEvent) => {
    if (event.type !== "permission.replied") return
    const { requestID } = event.properties as { sessionID: string; requestID: string; reply: string }
    setPermissions((prev) => prev.filter((p) => p.id !== requestID))
  }, [])

  const getPermissionForCall = useCallback(
    (sessionID: string, callID?: string | null) => {
      if (!sessionID || !callID) return undefined
      // Match by session + tool.callID (new structure)
      return permissions.find((p) => p.sessionID === sessionID && p.tool?.callID === callID)
    },
    [permissions],
  )

  const respondPermission = useCallback(async (requestID: string, reply: "once" | "always" | "reject") => {
    try {
      const result = await sdk.permissions.respond({
        path: { requestID },
        body: { reply },
      })
      const ok = Boolean(result && "data" in result && result.data === true)
      if (ok) setPermissions((prev) => prev.filter((p) => p.id !== requestID))
      return ok
    } catch (e) {
      return false
    }
  }, [])

  // Question events
  const handleQuestionAsked = useCallback((event: ServerEvent) => {
    if (event.type !== "question.asked") return
    const request = event.properties as QuestionRequest
    console.log("[MessagesContext] Question asked:", request.id, request.sessionID)
    setQuestions((prev) => {
      const newMap = new Map(prev)
      const sessionQuestions = newMap.get(request.sessionID) ?? []
      const exists = sessionQuestions.some((q) => q.id === request.id)
      if (exists) {
        // Update existing question
        newMap.set(
          request.sessionID,
          sessionQuestions.map((q) => (q.id === request.id ? request : q)),
        )
      } else {
        // Add new question
        newMap.set(request.sessionID, [...sessionQuestions, request])
      }
      return newMap
    })
  }, [])

  const handleQuestionReplied = useCallback((event: ServerEvent) => {
    if (event.type !== "question.replied") return
    const { sessionID, requestID } = event.properties as { sessionID: string; requestID: string }
    console.log("[MessagesContext] Question replied:", requestID, sessionID)
    setQuestions((prev) => {
      const newMap = new Map(prev)
      const sessionQuestions = newMap.get(sessionID)
      if (sessionQuestions) {
        newMap.set(
          sessionID,
          sessionQuestions.filter((q) => q.id !== requestID),
        )
      }
      return newMap
    })
  }, [])

  const handleQuestionRejected = useCallback((event: ServerEvent) => {
    if (event.type !== "question.rejected") return
    const { sessionID, requestID } = event.properties as { sessionID: string; requestID: string }
    console.log("[MessagesContext] Question rejected:", requestID, sessionID)
    setQuestions((prev) => {
      const newMap = new Map(prev)
      const sessionQuestions = newMap.get(sessionID)
      if (sessionQuestions) {
        newMap.set(
          sessionID,
          sessionQuestions.filter((q) => q.id !== requestID),
        )
      }
      return newMap
    })
  }, [])

  const getQuestionsBySession = useCallback(
    (sessionID: string): QuestionRequest[] => {
      return questions.get(sessionID) ?? []
    },
    [questions],
  )

  const getQuestionForCall = useCallback(
    (sessionID: string, callID?: string | null): QuestionRequest | undefined => {
      if (!sessionID || !callID) return undefined
      const sessionQuestions = questions.get(sessionID)
      if (!sessionQuestions) return undefined
      return sessionQuestions.find((q) => q.tool?.callID === callID)
    },
    [questions],
  )

  const replyQuestion = useCallback(async (requestID: string, answers: QuestionAnswer[]): Promise<boolean> => {
    try {
      await sdk.question.reply({
        requestID,
        answers,
      })
      // Remove from local state (event will also do this, but be proactive)
      setQuestions((prev) => {
        const newMap = new Map(prev)
        for (const [sessionID, sessionQuestions] of newMap) {
          const filtered = sessionQuestions.filter((q) => q.id !== requestID)
          if (filtered.length !== sessionQuestions.length) {
            newMap.set(sessionID, filtered)
            break
          }
        }
        return newMap
      })
      return true
    } catch (e) {
      console.error("[MessagesContext] Failed to reply to question:", e)
      return false
    }
  }, [])

  const rejectQuestion = useCallback(async (requestID: string): Promise<boolean> => {
    try {
      await sdk.question.reject({
        requestID,
      })
      // Remove from local state (event will also do this, but be proactive)
      setQuestions((prev) => {
        const newMap = new Map(prev)
        for (const [sessionID, sessionQuestions] of newMap) {
          const filtered = sessionQuestions.filter((q) => q.id !== requestID)
          if (filtered.length !== sessionQuestions.length) {
            newMap.set(sessionID, filtered)
            break
          }
        }
        return newMap
      })
      return true
    } catch (e) {
      console.error("[MessagesContext] Failed to reject question:", e)
      return false
    }
  }, [])

  // Consume the same forwarded global event stream as SessionContext so the
  // message state stays aligned with the rest of the WebGUI live updates.
  useEventHandler(sourceEmitter, "message.updated", handleMessageUpdated)
  useEventHandler(sourceEmitter, "message.part.delta", handlePartDelta)
  useEventHandler(sourceEmitter, "message.part.updated", handlePartUpdated)
  useEventHandler(sourceEmitter, "session.error", handleSessionError)
  useEventHandler(sourceEmitter, "message.removed", handleMessageRemoved)
  useEventHandler(sourceEmitter, "message.part.removed", handlePartRemoved)
  useEventHandler(sourceEmitter, "permission.asked", handlePermissionAsked)
  useEventHandler(sourceEmitter, "permission.replied", handlePermissionReplied)
  useEventHandler(sourceEmitter, "question.asked", handleQuestionAsked)
  useEventHandler(sourceEmitter, "question.replied", handleQuestionReplied)
  useEventHandler(sourceEmitter, "question.rejected", handleQuestionRejected)

  useEffect(() => {
    const unsubscribe = eventEmitter.on("server.connected", () => {
      const sessionID = session.currentSession?.id
      if (!sessionID) return
      void loadSessionMessages(sessionID)
    })

    return unsubscribe
  }, [loadSessionMessages, session.currentSession?.id])

  const value: MessagesContextValue = {
    messages,
    addMessage,
    addSessionError,
    updateMessage,
    removeMessage,
    addPart,
    updatePart,
    removePart,
    clearMessages,
    getMessagesBySession,
    loadSessionMessages,
    setMessages,
    removeSessionErrors,
    permissions,
    getPermissionForCall,
    respondPermission,
    questions,
    getQuestionsBySession,
    getQuestionForCall,
    replyQuestion,
    rejectQuestion,
  }

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMessages() {
  const context = useContext(MessagesContext)
  if (context === undefined) {
    throw new Error("useMessages must be used within a MessagesProvider")
  }
  return context
}
