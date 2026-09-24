import { useCallback, useEffect, useState, useRef } from "react"
import { useEventStream, useEventHandler, eventEmitter, type ServerEvent, type ConnectionState } from "./lib/api/events"
import { useSessionEvents } from "./lib/api/useSessionEvents"
import { useSession } from "./state/SessionContext"
import { useMessages } from "./state/MessagesContext"
import { useToast } from "./state/ToastContext"
import { MessageInput } from "./components/MessageInput"
import { MessageList } from "./components/MessageList"
import { MessagesProvider } from "./state/MessagesContext"
import { ThemeProvider } from "./state/ThemeContext"
import { CompactHeader } from "./components/CompactHeader"
import { OfflineBanner } from "./components/OfflineBanner"
import { CommandPalette } from "./components/CommandPalette"
import { KeyboardShortcutsHelp } from "./components/KeyboardShortcutsHelp"
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts"
import { ideBridge } from "./lib/ideBridge"
import { extractPathsFromDrop } from "./lib/dnd"
import { initKeyboardHandler, destroyKeyboardHandler } from "./lib/keyboardHandler"
import { uiBridgeSubscribe, uiBridgeUpdate, type UiBridgeState } from "./state/uiBridgeState"

const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac")

// Inner component that uses MessagesContext
function AppInner({ connectionState }: { connectionState: ConnectionState }) {
  const {
    currentSession,
    sessions,
    newVirtual,
    switchSession,
    isCreating,
    error,
    clearError,
    restoreSelections,
    loadSessions,
  } = useSession()
  const { loadSessionMessages } = useMessages()
  const { showToast } = useToast()
  const compactHeaderRef = useRef<{ toggleSessionDropdown: () => void }>(null)
  const messageInputRef = useRef<{
    focus: () => void
    insertPaths: (paths: string[]) => void
    pastePath: (path: string) => void
    insertPlainWithMentions: (value: string) => void
  }>(null)

  // Keyboard shortcuts state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const [bridge, setBridge] = useState<UiBridgeState | null>(null)
  const restored = useRef({ session: false, selections: false })
  const previousConnectionState = useRef<ConnectionState | null>(null)

  useEffect(() => uiBridgeSubscribe((s) => setBridge(s)), [])

  useEffect(() => {
    if (restored.current.session) return
    if (!bridge?.sessionID) return
    restored.current.session = true
    void switchSession(bridge.sessionID)
  }, [bridge?.sessionID, switchSession])

  useEffect(() => {
    if (restored.current.selections) return
    if (!bridge) return
    const has = !!(bridge.agent || bridge.variant || (bridge.providerId && bridge.modelId))
    if (!has) return
    restored.current.selections = true
    restoreSelections({
      providerId: bridge.providerId,
      modelId: bridge.modelId,
      agent: bridge.agent,
      variant: bridge.variant,
    })
  }, [bridge, restoreSelections])

  const handleNewSession = useCallback(() => {
    newVirtual()
  }, [newVirtual])

  const handleToggleSessionList = useCallback(() => {
    compactHeaderRef.current?.toggleSessionDropdown()
  }, [])

  // Keyboard shortcuts handlers
  const handleCloseModal = useCallback(() => {
    if (isCommandPaletteOpen) {
      setIsCommandPaletteOpen(false)
    } else if (isHelpOpen) {
      setIsHelpOpen(false)
    } else if (isSettingsOpen) {
      setIsSettingsOpen(false)
    }
  }, [isCommandPaletteOpen, isHelpOpen, isSettingsOpen])

  const isAnyModalOpen = isCommandPaletteOpen || isHelpOpen || isSettingsOpen

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onNewSession: handleNewSession,
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
    onShowHelp: () => setIsHelpOpen(true),
    onCloseModal: handleCloseModal,
    onToggleSessionList: handleToggleSessionList,
    isModalOpen: isAnyModalOpen,
  })

  // Fix Cmd/Ctrl clipboard shortcuts in VSCode webview iframe (macOS)
  useEffect(() => {
    const handler = initKeyboardHandler()
    return () => {
      handler.destroy()
      destroyKeyboardHandler()
    }
  }, [])

  // Host → UI bridge messages
  useEffect(() => {
    const handler = (msg: any) => {
      if (!msg || typeof msg !== "object") return
      if (msg.type === "insertPaths") {
        const paths = (msg.payload?.paths ?? msg.paths) as string[] | undefined
        if (Array.isArray(paths) && paths.length > 0) {
          messageInputRef.current?.focus()
          messageInputRef.current?.insertPaths(paths)
        }
      }
      if (msg.type === "pastePath") {
        const path = (msg.payload?.path ?? msg.path) as string | undefined
        if (typeof path === "string" && path.length > 0) {
          messageInputRef.current?.focus()
          messageInputRef.current?.pastePath(path)
        }
      }
      if (msg.type === "drag-event") {
        if (!isMac) return
        const eventType = typeof msg.eventType === "string" ? msg.eventType : ""
        const payload = msg.payload as
          | {
              clientX?: number
              clientY?: number
              shiftKey?: boolean
              dataTransfer?: { data?: Record<string, string> }
            }
          | undefined
        if (!eventType || !payload) return

        if (eventType === "drop" && payload.dataTransfer && payload.dataTransfer.data) {
          const uriList = payload.dataTransfer.data["application/vnd.code.uri-list"] as string | undefined
          if (!uriList) return
          const paths = uriList
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !s.startsWith("#"))
            .map((uri) => (uri.startsWith("file://") ? uri.replace("file://", "") : uri))
          if (paths.length === 0) return
          messageInputRef.current?.focus()
          messageInputRef.current?.insertPaths(paths)
          return
        }

        const clientX = typeof payload.clientX === "number" ? payload.clientX : 0
        const clientY = typeof payload.clientY === "number" ? payload.clientY : 0
        const shiftKey = !!payload.shiftKey
        const target = document.elementFromPoint(clientX, clientY) ?? document.body
        const synthetic = new DragEvent(eventType, {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          shiftKey,
        })
        target.dispatchEvent(synthetic)
      }
    }
    ideBridge.on(handler)
    return () => ideBridge.off(handler)
  }, [])

  // Accept drop anywhere in the webview (VSCode iframe)
  useEffect(() => {
    const onDragOver = (ev: DragEvent) => {
      ev.preventDefault()
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = "copy"
    }
    const onDrop = (ev: DragEvent) => {
      ev.preventDefault()
      ev.stopPropagation()
      const paths = extractPathsFromDrop(ev)
      if (paths && paths.length > 0) {
        messageInputRef.current?.focus()
        messageInputRef.current?.insertPaths(paths)
      }
    }
    document.addEventListener("dragover", onDragOver as any)
    document.addEventListener("drop", onDrop as any)
    return () => {
      document.removeEventListener("dragover", onDragOver as any)
      document.removeEventListener("drop", onDrop as any)
    }
  }, [])

  // Load messages when session changes
  useEffect(() => {
    if (currentSession?.id) {
      console.log("[App] Current session changed, loading messages:", currentSession.id)
      loadSessionMessages(currentSession.id)
      uiBridgeUpdate({ sessionID: currentSession.id })
      // Focus message input when session changes
      setTimeout(() => {
        messageInputRef.current?.focus()
      }, 100)
    }
  }, [currentSession?.id, loadSessionMessages])

  useEffect(() => {
    const previousState = previousConnectionState.current
    previousConnectionState.current = connectionState

    if (connectionState !== "connected" || previousState === "connected") return

    console.log("[App] Connection established, refreshing session state")
    void loadSessions()

    if (bridge?.sessionID && currentSession?.id !== bridge.sessionID) {
      void switchSession(bridge.sessionID)
      return
    }

    if (currentSession?.id) {
      void loadSessionMessages(currentSession.id)
    }
  }, [bridge?.sessionID, connectionState, currentSession?.id, loadSessionMessages, loadSessions, switchSession])

  // Show toast for session context errors
  useEffect(() => {
    if (error) {
      showToast(error.message, {
        title: "Error",
        variant: "error",
        duration: 8000,
      })
      // Clear error after showing toast
      clearError()
    }
  }, [error, showToast, clearError])

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950">
      {/* Compact Header */}
      <CompactHeader
        ref={compactHeaderRef}
        connectionState={connectionState}
        onNewSession={handleNewSession}
        isCreatingSession={isCreating}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* Offline Banner */}
      <OfflineBanner connectionState={connectionState} />

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto px-4 py-3">
        <MessageList
          sessionID={currentSession?.id}
          onUndoToInput={(value) => messageInputRef.current?.insertPlainWithMentions(value)}
        />
      </main>

      {/* Input Area */}
      <MessageInput
        ref={messageInputRef}
        sessionID={currentSession?.id ?? null}
        onMessageSent={() => {
          console.log("[App] Message sent successfully")
        }}
        onError={(error) => {
          console.error("[App] Message send error:", error)
        }}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        sessions={sessions}
        onNewSession={handleNewSession}
        onSwitchSession={switchSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onShowHelp={() => setIsHelpOpen(true)}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  )
}

function AppContent() {
  const { connectionState, emitter } = useEventStream({
    debug: true,
    onConnectionStateChange: (state) => {
      console.log("[App] Connection state changed:", state)
    },
  })

  const { currentSession, setIsIdle } = useSession()
  const { showToast } = useToast()

  const handleAllEvents = useCallback(
    (event: ServerEvent) => {
      // Forward all events to the global singleton for SessionContext
      eventEmitter.emit(event)

      if (event.type === "server.connected") {
        console.log("[App] Successfully connected to OpenCode server")
        showToast("Connected to OpenCode server", { variant: "success", duration: 3000 })
      }

      // Handle session.idle events to show/hide typing indicator
      // Note: session.idle event only fires when session BECOMES idle (no idle boolean in payload)
      if (event.type === "session.idle") {
        const { sessionID } = event.properties
        console.log("[App] session.idle event:", { sessionID, currentSessionID: currentSession?.id })
        if (currentSession?.id === sessionID) {
          console.log("[App] Session became idle, setting isIdle to true")
          setIsIdle(true)
        } else {
          console.log("[App] Ignoring idle event for different session")
        }
      }

      // session.error is handled in MessagesContext.tsx to show a persistent message

      // Handle session compaction
      if (event.type === "session.compacted") {
        const { sessionID } = event.properties
        if (currentSession?.id === sessionID) {
          console.log("[App] Session compacted:", sessionID)
          showToast("Session history has been compacted to save space", {
            title: "Session Compacted",
            variant: "info",
            duration: 5000,
          })
        }
      }
    },
    [currentSession?.id, setIsIdle, showToast],
  )

  useEventHandler(emitter, "*", handleAllEvents)

  useSessionEvents(emitter, {
    onSessionCreated: (event) => {
      console.log("[App] Session created:", event.properties.sessionID)
    },
    onSessionUpdated: (event) => {
      console.log("[App] Session updated:", event.properties.sessionID)
    },
    onSessionDeleted: (event) => {
      console.log("[App] Session deleted:", event.properties.sessionID)
    },
  })

  return (
    <MessagesProvider emitter={emitter}>
      <AppInner connectionState={connectionState} />
    </MessagesProvider>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
