import { useEffect } from "react"
import { useMessages } from "../../state/MessagesContext"
import { useSession } from "../../state/SessionContext"
import { TypingIndicator } from "../TypingIndicator"
import { ConfirmModal } from "../ConfirmModal"
import { EmptyState } from "./EmptyState"
import { MessageRow } from "./MessageRow"
import { RevertBanner } from "./RevertBanner"
import { RevertSummary } from "./RevertSummary"
import { QuestionPart } from "./Parts/QuestionPart"
import { useMessageScroll } from "./hooks/useMessageScroll"
import { useMessageActions } from "./hooks/useMessageActions"

interface MessageListProps {
  sessionID?: string | null
  onUndoToInput?: (value: string) => void
}

export function MessageList({ sessionID, onUndoToInput }: MessageListProps) {
  const { getMessagesBySession, messages, getQuestionsBySession } = useMessages()
  const { isIdle, isReasoning, currentSession } = useSession()

  // Get pending questions for current session
  const pendingQuestions = sessionID ? getQuestionsBySession(sessionID) : []

  // Debug logging for isIdle state
  useEffect(() => {
    console.log("[MessageList] isIdle state changed:", isIdle)
  }, [isIdle])

  // Get messages for current session
  const sessionMessages = sessionID ? getMessagesBySession(sessionID) : []

  // Debug logging
  useEffect(() => {
    console.log("[MessageList] Debug info:", {
      sessionID,
      totalMessages: messages.length,
      sessionMessages: sessionMessages.length,
      messageSessionIDs: messages.map((m) => ({ id: m.info.id, sessionID: m.info.sessionID })),
    })
  }, [sessionID, messages, sessionMessages])

  // Sort messages by creation time
  const sortedMessages = [...sessionMessages].sort((a, b) => {
    return a.info.time.created - b.info.time.created
  })

  const { messagesEndRef, messagesContainerRef } = useMessageScroll(sessionID, sortedMessages, isIdle, isReasoning)

  const {
    forkConfirm,
    isForking,
    revertAction,
    isRevertBusy,
    handleForkStart,
    handleForkConfirm,
    handleRevert,
    handleRevertConfirm,
    handleRevertCancel,
    handleRedoClick,
    handleRestoreClick,
    setForkConfirm,
  } = useMessageActions(sessionID, onUndoToInput)

  // Show empty state if no messages
  if (!sessionID || sortedMessages.length === 0) {
    return <EmptyState />
  }

  // Inline revert handling: if session has a revert boundary, hide messages at/after it
  const revertBoundaryID = currentSession?.revert?.messageID

  const visibleMessages = (() => {
    if (!revertBoundaryID) return sortedMessages
    const index = sortedMessages.findIndex((m) => m.info.id === revertBoundaryID)
    if (index === -1) return sortedMessages
    return sortedMessages.slice(0, index)
  })()

  const lastMessageID = visibleMessages.at(-1)?.info.id

  // Build rows with optional inline reverted summary block
  const rows: React.ReactNode[] = []
  let insertedRevertSummary = false
  if (revertBoundaryID) {
    for (const message of sortedMessages) {
      if (!insertedRevertSummary && message.info.id === revertBoundaryID) {
        // Insert a compact inline summary and stop rendering further messages
        rows.push(
          <RevertSummary
            key="revert-summary"
            onRedo={handleRedoClick}
            onRestore={handleRestoreClick}
            isRevertBusy={isRevertBusy}
          />,
        )
        insertedRevertSummary = true
        break
      }
      rows.push(
        <MessageRow
          key={message.info.id}
          message={message}
          onFork={handleForkStart}
          onRevert={handleRevert}
          revertBusy={isRevertBusy}
          sessionID={sessionID || undefined}
          isLast={message.info.id === lastMessageID}
        />,
      )
    }
  } else {
    for (const message of sortedMessages) {
      const isSummaryAssistant =
        message.info.role === "assistant" && (message.info as { summary?: boolean }).summary === true

      if (isSummaryAssistant) {
        rows.push(
          <div key={`${message.info.id}-summary-separator`} className="flex items-center my-4">
            <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
            <span className="mx-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              会话在此处被压缩
            </span>
            <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
          </div>,
        )
      }

      rows.push(
        <MessageRow
          key={message.info.id}
          message={message}
          onFork={handleForkStart}
          onRevert={handleRevert}
          revertBusy={isRevertBusy}
          sessionID={sessionID || undefined}
          isLast={message.info.id === lastMessageID}
        />,
      )
    }
  }

  return (
    <>
      <div ref={messagesContainerRef} className="h-full">
        <div className="space-y-2">
          {/* Revert banner (pinned to top of scroll area) */}
          {currentSession?.revert?.messageID && (
            <RevertBanner onRedo={handleRedoClick} onRestore={handleRestoreClick} isRevertBusy={isRevertBusy} />
          )}

          {rows}

          {/* Pending questions from server */}
          {pendingQuestions.map((question) => (
            <div key={question.id} className="px-4">
              <QuestionPart request={question} />
            </div>
          ))}

          {/* Typing indicator - hide while reasoning parts are streaming */}
          <TypingIndicator visible={!isIdle && !isReasoning} />
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fork confirmation modal */}
      <ConfirmModal
        isOpen={!!forkConfirm}
        onClose={() => setForkConfirm(null)}
        onConfirm={handleForkConfirm}
        title="会话分支"
        message="以此消息为界创建新会话？将复制之前的对话历史。"
        confirmText="分支"
        cancelText="取消"
        variant="info"
        isLoading={isForking}
      />

      {/* Revert / Redo / Restore confirmation modal */}
      <ConfirmModal
        isOpen={!!revertAction}
        onClose={handleRevertCancel}
        onConfirm={handleRevertConfirm}
        title={
          revertAction?.type === "undo"
            ? "回退会话改动"
            : revertAction?.type === "redo"
              ? "重做会话改动"
              : revertAction?.type === "restore"
                ? "恢复所有改动"
                : ""
        }
        message={
          revertAction?.type === "undo"
            ? "回退此消息之后的消息和文件改动？"
            : revertAction?.type === "redo"
              ? "重做下一批已回退的消息和文件改动？"
              : revertAction?.type === "restore"
                ? "恢复所有已回退的消息和文件改动？"
                : ""
        }
        confirmText={
          revertAction?.type === "undo"
            ? "Undo"
            : revertAction?.type === "redo"
              ? "Redo"
              : revertAction?.type === "restore"
                ? "Restore"
                : "确认"
        }
        cancelText="取消"
        variant="warning"
        isLoading={isRevertBusy}
      />
    </>
  )
}
