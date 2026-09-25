import { t } from "../../lib/i18n"
import { useEffect } from "react"
import { ModelSelector } from "../ModelSelector"
import { AgentSelector } from "../AgentSelector"
import { VariantSelector } from "../VariantSelector"
import { IconButton } from "../common"
import { MessageActions } from "./MessageActions"
import { uiBridgeUpdate } from "../../state/uiBridgeState"

interface EditorToolbarProps {
  selectedProviderId: string | undefined
  selectedModelId: string | undefined
  selectedAgent: string
  onModelSelect: (providerId: string, modelId: string) => void
  onAgentSelect: (agent: string) => void
  onFileSelect: () => void
  isDisabled: boolean
  modelSelectorKey: number
  lastFailedMessage: string | null
  onRetry: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  isIdle: boolean
  isButtonDisabled: boolean
  isCompactDisabled: boolean
  onSubmit: () => void
  onAbort: () => void
  onCompactClick: () => void
  variants?: string[]
  selectedVariant?: string
  onVariantSelect: (variant: string | undefined) => void
  isReasoningModel?: boolean
}

export function EditorToolbar({
  selectedProviderId,
  selectedModelId,
  selectedAgent,
  onModelSelect,
  onAgentSelect,
  onFileSelect,
  isDisabled,
  modelSelectorKey,
  lastFailedMessage,
  onRetry,
  fileInputRef,
  onFileChange,
  isIdle,
  isButtonDisabled,
  isCompactDisabled,
  onSubmit,
  onAbort,
  onCompactClick,
  variants,
  selectedVariant,
  onVariantSelect,
  isReasoningModel,
}: EditorToolbarProps) {
  useEffect(() => {
    uiBridgeUpdate({
      providerId: selectedProviderId ?? null,
      modelId: selectedModelId ?? null,
      agent: selectedAgent ?? null,
      variant: selectedVariant ?? null,
    })
  }, [selectedProviderId, selectedModelId, selectedAgent, selectedVariant])

  return (
    <div className="h-8 px-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-1">
        {lastFailedMessage && (
          <button
            onClick={onRetry}
            className="h-6 px-2 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 rounded border border-red-200 dark:border-red-800"
            title={t("恢复失败的消息")}
            data-tip={t("恢复失败的消息")}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Retry
          </button>
        )}
        <ModelSelector
          key={modelSelectorKey}
          selectedProviderId={selectedProviderId}
          selectedModelId={selectedModelId}
          onSelect={onModelSelect}
          disabled={isDisabled}
        />
        <VariantSelector
          variants={variants}
          selectedVariant={selectedVariant}
          onSelect={onVariantSelect}
          disabled={isDisabled}
          isReasoningModel={isReasoningModel}
        />
        <AgentSelector selectedAgent={selectedAgent} onSelect={onAgentSelect} disabled={isDisabled} />
        <IconButton
          onClick={onFileSelect}
          size="sm"
          disabled={isDisabled}
          aria-label={t("添加文件")}
          title={t("添加文件")}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          }
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf,text/*"
          multiple
          onChange={onFileChange}
          className="hidden"
        />
      </div>
      <MessageActions
        isIdle={isIdle}
        isButtonDisabled={isButtonDisabled}
        isCompactDisabled={isCompactDisabled}
        onSubmit={onSubmit}
        onAbort={onAbort}
        onCompactClick={onCompactClick}
      />
    </div>
  )
}
