import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle, useMemo } from "react"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getRoot, $getSelection, $isRangeSelection, $createTextNode, type EditorState } from "lexical"
import { $createMentionNode } from "../mention/MentionNode"
import { useSession } from "../../state/SessionContext"
import { useProject } from "../../state/ProjectContext"
import { useProviders } from "../../state/ProvidersContext"
import { eventEmitter } from "../../lib/api/events"
import { sdk } from "../../lib/api/sdkClient"
import type { Provider } from "@opencode-ai/sdk/client"
import { toProjectRelative } from "../../utils/path"
import { ConfirmModal } from "../ConfirmModal"
import { createEditorConfig } from "./EditorConfig"
import { EditorContent } from "./EditorContent"
import { EditorToolbar } from "./EditorToolbar"
import { FooterPanels } from "./FooterPanels"
import { useMessageInput } from "./hooks/useMessageInput"
import { useFileAttachment } from "./hooks/useFileAttachment"
import { useDragDrop } from "./hooks/useDragDrop"
import { useEditorKeyboard } from "./hooks/useEditorKeyboard"
import { useMessageParts } from "./hooks/useMessageParts"
import { insertPlainWithMentionsImpl } from "./utils"
import { uiBridgeSubscribe, uiBridgeUpdate } from "../../state/uiBridgeState"

interface MessageInputProps {
  sessionID: string | null
  onMessageSent?: () => void
  onError?: (error: Error) => void
}

export const MessageInput = forwardRef<
  {
    focus: () => void
    insertPaths: (paths: string[]) => void
    pastePath: (path: string) => void
    insertPlainWithMentions: (value: string) => void
  },
  MessageInputProps
>(({ sessionID, onMessageSent, onError }, ref) => {
  const initialConfig = createEditorConfig()

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <MessageInputInner ref={ref} sessionID={sessionID} onMessageSent={onMessageSent} onError={onError} />
    </LexicalComposer>
  )
})

MessageInput.displayName = "MessageInput"

const MessageInputInner = forwardRef<
  {
    focus: () => void
    insertPaths: (paths: string[]) => void
    pastePath: (path: string) => void
    insertPlainWithMentions: (value: string) => void
  },
  MessageInputProps
>(({ sessionID, onMessageSent, onError }, ref) => {
  const [editor] = useLexicalComposerContext()
  const [isEmpty, setIsEmpty] = useState(true)
  const [isCompactConfirmOpen, setIsCompactConfirmOpen] = useState(false)
  const [isCompacting, setIsCompacting] = useState(false)
  const [modelSelectorKey, setModelSelectorKey] = useState(0)
  const contentEditableRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { worktree } = useProject()
  const {
    isIdle,
    selectedProviderId,
    selectedModelId,
    selectedAgent,
    setSelectedModel,
    setSelectedAgent,
    selectedVariant,
    setSelectedVariant,
  } = useSession()
  const { providersDirty, clearProvidersDirty } = useProviders()

  // Providers state for variants computation
  const [providers, setProviders] = useState<Provider[]>([])
  const [username, setUsername] = useState<string | undefined>(undefined)

  const [isRestoring, setIsRestoring] = useState(false)
  const restored = useRef(false)

  const handleEditorChange = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      const root = $getRoot()
      const textContent = root.getTextContent()
      setIsEmpty(textContent.trim().length === 0)
      if (!isRestoring) uiBridgeUpdate({ input: textContent })
    })
  }, [isRestoring])

  const resolveToAbsolutePath = useCallback(
    (path: string | undefined): string => {
      if (!path) return ""
      const p = path.replaceAll("\\", "/")
      const isDrive = /^[A-Za-z]:\//.test(p)
      const isUnc = p.startsWith("//")
      const isRooted = p.startsWith("/")
      if (isDrive || isUnc || isRooted) return p
      if (!worktree) return p
      const wtNorm = worktree.replaceAll("\\", "/")
      const wt = wtNorm.endsWith("/") ? wtNorm.slice(0, -1) : wtNorm
      return `${wt}/${p}`
    },
    [worktree],
  )

  const parseWithRange = useCallback(
    (val: string): { display: string; path: string; range?: { start: number; end: number } } => {
      const idx = val.lastIndexOf(":")
      if (idx > 0) {
        const base = val.slice(0, idx)
        const tail = val.slice(idx + 1)
        const m = tail.match(/^(\d+)-(\d+)$/)
        if (m) {
          const start = parseInt(m[1], 10)
          const end = parseInt(m[2], 10)
          if (!Number.isNaN(start) && !Number.isNaN(end)) {
            return { display: val, path: base, range: { start, end } }
          }
        }
        return { display: val, path: val }
      }
      return { display: val, path: val }
    },
    [],
  )

  const { extractMessageParts } = useMessageParts({ editor, resolveToAbsolutePath })

  const { isSending, lastFailedMessage, handleSubmit, handleRetry, handleAbort, handleCompact } = useMessageInput({
    sessionID,
    editor,
    isEmpty,
    selectedProviderId,
    selectedModelId,
    selectedVariant,
    selectedAgent,
    extractMessageParts,
    onMessageSent,
    onError,
  })

  const { fileInputRef, handleFileSelect, handleFileChange } = useFileAttachment(editor)

  useDragDrop({ contentEditableRef, containerRef, editor, worktree, parseWithRange })

  useEditorKeyboard({ editor, contentEditableRef, parseWithRange, onSubmit: handleSubmit })

  // Restore input from IDE bridge state
  useEffect(() => {
    return uiBridgeSubscribe((s) => {
      if (restored.current) return
      if (!s.input) return
      restored.current = true
      setIsRestoring(true)
      insertPlainWithMentionsImpl(editor, parseWithRange, s.input, { replace: true })
      setTimeout(() => setIsRestoring(false), 0)
    })
  }, [editor, parseWithRange])

  // Expose methods to parent
  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        editor.focus()
      },
      insertPaths: (paths: string[]) => {
        if (!paths || paths.length === 0) return
        let tries = 0
        const perform = () => {
          if (!worktree && tries++ < 10) {
            setTimeout(perform, 200)
            return
          }
          editor.update(() => {
            const selection = $getSelection()
            if (!$isRangeSelection(selection)) return
            const nodes = [] as any[]
            for (const raw of paths) {
              const isDir = raw.endsWith("/")
              if (isDir) {
                let rel = toProjectRelative(raw, worktree)
                if (!rel.endsWith("/")) rel = rel + "/"
                const metadata = {
                  type: "directory" as const,
                  display: rel,
                  path: rel,
                }
                nodes.push($createMentionNode(metadata))
                nodes.push($createTextNode(" "))
                continue
              }

              const parsed = parseWithRange(raw)
              const relBase = toProjectRelative(parsed.path, worktree)
              const display = parsed.range ? `${relBase}:${parsed.range.start}-${parsed.range.end}` : relBase
              const metadata: any = {
                type: "file" as const,
                display,
                path: relBase,
              }
              if (parsed.range) {
                metadata.range = {
                  start: { line: parsed.range.start, character: 0 },
                  end: { line: parsed.range.end, character: 0 },
                }
              }
              nodes.push($createMentionNode(metadata))
              nodes.push($createTextNode(" "))
            }
            if (nodes.length > 0) selection.insertNodes(nodes)
          })
        }
        perform()
      },
      pastePath: (path: string) => {
        if (!path) return
        let tries = 0
        const perform = () => {
          if (!worktree && tries++ < 10) {
            setTimeout(perform, 200)
            return
          }
          editor.update(() => {
            const selection = $getSelection()
            if (!$isRangeSelection(selection)) return
            let rel = toProjectRelative(path, worktree)
            if (!rel.endsWith("/")) rel = rel + "/"
            const metadata = {
              type: "directory" as const,
              display: rel,
              path: rel,
            }
            selection.insertNodes([$createMentionNode(metadata), $createTextNode(" ")])
          })
        }
        perform()
      },
      insertPlainWithMentions: (value: string) => {
        insertPlainWithMentionsImpl(editor, parseWithRange, value, { replace: true })
      },
    }),
    [editor, worktree, parseWithRange],
  )

  // Disable/enable editor based on isSending state
  useEffect(() => {
    editor.setEditable(!isSending)
  }, [editor, isSending])

  // Load providers for variant computation. The server can briefly report an empty
  // list while it reloads (e.g. right after saving settings), so the last good list
  // is kept and an empty response is retried instead of clobbering the variants.
  const providerRetry = useRef(0)

  const reloadProviders = useCallback(async () => {
    try {
      const response = await sdk.config.providers()
      if (response.data && response.data.providers.length > 0) {
        setProviders(response.data.providers)
      }
    } catch (err) {
      console.error("[MessageInput] Failed to load providers:", err)
    }
  }, [])

  useEffect(() => {
    let active = true

    void reloadProviders()
    const unsubscribe = eventEmitter.on("server.connected", () => {
      if (!active) return
      void reloadProviders()
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [reloadProviders])

  // Retry while no providers are known yet (backend warmup/reload).
  useEffect(() => {
    if (providers.length > 0) {
      providerRetry.current = 0
      return
    }
    if (providerRetry.current >= 15) return
    providerRetry.current += 1
    const timer = window.setTimeout(() => void reloadProviders(), 2000)
    return () => window.clearTimeout(timer)
  }, [providers.length, reloadProviders])

  // Update model selector when providers change
  useEffect(() => {
    if (!providersDirty) return
    setModelSelectorKey((value) => value + 1)
    void reloadProviders()
    clearProvidersDirty()
  }, [providersDirty, clearProvidersDirty, reloadProviders])

  // Greeting placeholder uses the configured username when present.
  useEffect(() => {
    let active = true
    void sdk.config.get().then((response) => {
      if (!active || !response.data) return
      const name = (response.data as { username?: unknown }).username
      if (typeof name === "string" && name.trim()) setUsername(name.trim())
    })
    return () => {
      active = false
    }
  }, [])

  const currentModelInfo = useMemo(() => {
    if (!selectedProviderId || !selectedModelId) {
      return {
        variants: undefined as string[] | undefined,
        isReasoning: false,
      }
    }
    const provider = providers.find((p) => p.id === selectedProviderId)
    if (!provider) {
      return {
        variants: undefined,
        isReasoning: false,
      }
    }
    const model = provider.models?.[selectedModelId] as
      | ((typeof provider.models)[string] & {
          // opencode v2 lists the thinking variants as an array of { id, settings }
          // objects (e.g. [{ id: "low" }, { id: "max" }]), not as a keyed record.
          variants?: (string | { id?: string })[]
          capabilities?: { reasoning?: boolean }
        })
      | undefined

    const variants = model?.variants
      ?.map((variant) => (typeof variant === "string" ? variant : variant.id))
      .filter((id): id is string => typeof id === "string" && id.length > 0)

    return {
      variants: variants?.length ? variants : undefined,
      isReasoning: !!model?.capabilities?.reasoning || !!variants?.length,
    }
  }, [providers, selectedProviderId, selectedModelId])

  // A stored variant may belong to a previously selected model (e.g. "max" while the
  // current model only offers "low"/"high"); reset it so the request stays valid.
  useEffect(() => {
    if (!selectedVariant) return
    const variants = currentModelInfo.variants
    if (!variants || variants.includes(selectedVariant)) return
    void setSelectedVariant(undefined)
  }, [currentModelInfo.variants, selectedVariant, setSelectedVariant])

  const isDisabled = isSending
  const isButtonDisabled = isDisabled || isEmpty
  const isCompactDisabled =
    isSending ||
    isCompacting ||
    !sessionID ||
    sessionID.startsWith("virtual-") ||
    !selectedProviderId ||
    !selectedModelId

  const handleCompactWithModal = useCallback(async () => {
    setIsCompacting(true)
    await handleCompact(() => {
      setIsCompacting(false)
      setIsCompactConfirmOpen(false)
    })
  }, [handleCompact])

  return (
    <>
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0">
        <FooterPanels sessionID={sessionID} />
        <EditorContent
          contentEditableRef={contentEditableRef}
          containerRef={containerRef}
          onEditorChange={handleEditorChange}
          placeholder={`Hello ${username ?? "owner"}`}
        />
        <EditorToolbar
          selectedProviderId={selectedProviderId}
          selectedModelId={selectedModelId}
          selectedAgent={selectedAgent}
          onModelSelect={setSelectedModel}
          onAgentSelect={setSelectedAgent}
          onFileSelect={handleFileSelect}
          isDisabled={isDisabled}
          modelSelectorKey={modelSelectorKey}
          lastFailedMessage={lastFailedMessage}
          onRetry={handleRetry}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          isIdle={isIdle}
          isButtonDisabled={isButtonDisabled}
          isCompactDisabled={isCompactDisabled}
          onSubmit={handleSubmit}
          onAbort={handleAbort}
          onCompactClick={() => setIsCompactConfirmOpen(true)}
          variants={currentModelInfo.variants}
          selectedVariant={selectedVariant}
          onVariantSelect={(variant) => setSelectedVariant(variant)}
          isReasoningModel={currentModelInfo.isReasoning}
        />
      </footer>

      <ConfirmModal
        isOpen={isCompactConfirmOpen}
        onClose={() => setIsCompactConfirmOpen(false)}
        onConfirm={handleCompactWithModal}
        title="Compact session history"
        message="This will summarize earlier parts of the conversation to save context. Recent messages will be kept, but long-term details may be lost. Proceed?"
        confirmText="Compact"
        cancelText="Cancel"
        variant="warning"
        isLoading={isCompacting}
      />
    </>
  )
})

MessageInputInner.displayName = "MessageInputInner"
