import { t } from "../../../lib/i18n"
import { useState, useCallback, useEffect } from "react"
import { $getRoot, $createParagraphNode, $createTextNode, type LexicalEditor } from "lexical"
import { sdk } from "../../../lib/api/sdkClient"
import { useSession } from "../../../state/SessionContext"
import { useToast } from "../../../state/ToastContext"
import { loadCommands } from "../../../hooks/useCommandSearch"

interface UseMessageInputOptions {
  sessionID: string | null
  editor: LexicalEditor
  isEmpty: boolean
  selectedProviderId: string | undefined
  selectedModelId: string | undefined
  selectedAgent: string
  selectedVariant: string | undefined
  extractMessageParts: () => any[]
  onMessageSent?: () => void
  onError?: (error: Error) => void
}

export function useMessageInput({
  sessionID,
  editor,
  isEmpty,
  selectedProviderId,
  selectedModelId,
  selectedAgent,
  selectedVariant,
  extractMessageParts,
  onMessageSent,
  onError,
}: UseMessageInputOptions) {
  const [isSending, setIsSending] = useState(false)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const { showToast } = useToast()
  const { setIsIdle, isVirtualSession, materializeSession } = useSession()

  // Reset isSending when session changes
  useEffect(() => {
    setIsSending(false)
  }, [sessionID])

  const handleSubmit = useCallback(async () => {
    if (!sessionID || isEmpty) return

    setIsSending(true)
    setIsIdle(false)

    let savedMessage = ""
    editor.getEditorState().read(() => {
      const root = $getRoot()
      savedMessage = root.getTextContent()
    })

    try {
      const trimmedMessage = savedMessage.trim()
      const isCommand = trimmedMessage.startsWith("/")
      const commandParts = isCommand ? trimmedMessage.slice(1).split(/\s+/) : []
      const commandName = commandParts[0]
      const commandArgs = commandParts.slice(1).join(" ")
      const commandList = isCommand && commandName ? await loadCommands() : []
      const shouldRunCommand =
        commandList.length > 0 &&
        commandList.some((command) => command.name.toLowerCase() === commandName.toLowerCase())
      const isUnknownCommand = isCommand && !!commandName && commandList.length > 0 && !shouldRunCommand

      if (isUnknownCommand) {
        showToast(`Unknown command "/${commandName}". Sending as regular message.`, {
          title: t("未知命令"),
          variant: "warning",
          duration: 4000,
        })
      }

      const parts = shouldRunCommand ? [] : extractMessageParts()

      if (!shouldRunCommand && parts.length === 0) {
        throw new Error(t("消息内容为空"))
      }

      let actualSessionID = sessionID
      if (isVirtualSession) {
        console.log("[MessageInput] Materializing virtual session before sending message...")
        const realSession = await materializeSession()
        if (!realSession) {
          throw new Error(t("创建会话失败"))
        }
        actualSessionID = realSession.id
        console.log("[MessageInput] Virtual session materialized:", actualSessionID)
      }

      editor.update(() => {
        const root = $getRoot()
        root.clear()
        const paragraph = $createParagraphNode()
        root.append(paragraph)
      })

      setLastFailedMessage(null)
      onMessageSent?.()

      setTimeout(() => {
        editor.focus()
      }, 0)

      if (shouldRunCommand) {
        const requestBody: any = {
          command: commandName,
          // Server schema requires `arguments` even if empty
          arguments: commandArgs,
        }

        if (selectedProviderId && selectedModelId) {
          requestBody.model = `${selectedProviderId}/${selectedModelId}`
        }

        requestBody.agent = selectedAgent

        if (selectedVariant) {
          requestBody.variant = selectedVariant
        }

        const response = await sdk.session.command({
          path: { id: actualSessionID },
          body: requestBody,
        })

        if (response.error) {
          const errorMsg =
            "data" in response.error &&
            response.error.data &&
            typeof response.error.data === "object" &&
            "message" in response.error.data
              ? String(response.error.data.message)
              : t("执行命令失败")
          throw new Error(errorMsg)
        }
      } else {
        const requestBody: any = {
          parts,
        }

        if (selectedProviderId && selectedModelId) {
          requestBody.model = {
            providerID: selectedProviderId,
            modelID: selectedModelId,
          }
        }

        requestBody.agent = selectedAgent

        if (selectedVariant) {
          requestBody.variant = selectedVariant
        }

        const response = await sdk.session.prompt({
          path: { id: actualSessionID },
          body: requestBody,
        })

        if (response.error) {
          const errorMsg =
            "data" in response.error &&
            response.error.data &&
            typeof response.error.data === "object" &&
            "message" in response.error.data
              ? String(response.error.data.message)
              : t("发送消息失败")
          throw new Error(errorMsg)
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(t("发送消息失败"))
      console.error("[MessageInput] Failed to send message:", error)

      // Restore failed message for retry
      setLastFailedMessage(savedMessage)

      showToast(error.message, {
        title: t("发送消息失败"),
        variant: "error",
        duration: 8000,
      })

      onError?.(error)
      setIsIdle(true)
    } finally {
      setIsSending(false)
    }
  }, [
    sessionID,
    isEmpty,
    selectedProviderId,
    selectedModelId,
    selectedAgent,
    selectedVariant,
    onMessageSent,
    onError,
    setIsIdle,
    showToast,
    isVirtualSession,
    materializeSession,
    editor,
    extractMessageParts,
  ])

  const handleRetry = useCallback(() => {
    if (lastFailedMessage) {
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        const paragraph = $createParagraphNode()
        const text = $createTextNode(lastFailedMessage)
        paragraph.append(text)
        root.append(paragraph)
      })
      setLastFailedMessage(null)
      setTimeout(() => {
        editor.focus()
      }, 0)
    }
  }, [lastFailedMessage, editor])

  const handleAbort = useCallback(async () => {
    if (!sessionID) return
    if (sessionID.startsWith("virtual-")) return
    try {
      await sdk.session.abort({ path: { id: sessionID } })
      setIsIdle(true)
      setIsSending(false)
      setTimeout(() => {
        editor.focus()
      }, 0)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(t("中止会话失败"))
      console.error("[MessageInput] Failed to abort session:", error)
      showToast(error.message, {
        title: t("中止失败"),
        variant: "error",
        duration: 6000,
      })
    }
  }, [sessionID, setIsIdle, showToast, editor])

  const handleCompact = useCallback(
    async (closeModal: () => void) => {
      if (!sessionID) return
      if (sessionID.startsWith("virtual-")) {
        showToast(t("无法压缩虚拟会话，请先发送一条消息创建会话。"), {
          title: t("无法压缩"),
          variant: "warning",
          duration: 6000,
        })
        closeModal()
        return
      }
      if (!selectedProviderId || !selectedModelId) {
        showToast(t("压缩会话前请先选择模型。"), {
          title: t("请先选择模型"),
          variant: "warning",
          duration: 6000,
        })
        closeModal()
        return
      }

      closeModal()

      try {
        showToast(t("会话压缩已开始，完成后会通知你。"), {
          title: t("正在压缩会话"),
          variant: "info",
          duration: 5000,
        })

        const response = await sdk.session.summarize({
          path: { id: sessionID },
          body: {
            providerID: selectedProviderId,
            modelID: selectedModelId,
          },
        })

        if ((response as any).error) {
          const errorData =
            (response as any).error && typeof (response as any).error === "object" && "data" in (response as any).error
              ? (response as any).error.data
              : null
          const msg =
            errorData && typeof errorData === "object" && errorData !== null && "message" in errorData
              ? String((errorData as any).message)
              : t("压缩会话失败")
          showToast(msg, {
            title: t("压缩失败"),
            variant: "error",
            duration: 8000,
          })
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(t("压缩会话失败"))
        console.error("[MessageInput] Failed to compact session:", error)
        showToast(error.message, {
          title: t("压缩失败"),
          variant: "error",
          duration: 8000,
        })
      }
    },
    [sessionID, selectedProviderId, selectedModelId, showToast],
  )

  return {
    isSending,
    lastFailedMessage,
    handleSubmit,
    handleRetry,
    handleAbort,
    handleCompact,
  }
}
