import { t } from "../../lib/i18n"
import { useEffect, useRef, useState } from "react"
import { IconButton } from "../common"
import { MessageStats } from "./MessageStats"
import { ideBridge } from "../../lib/ideBridge"

interface TokenData {
  input: number
  output: number
  reasoning: number
  cache: {
    read: number
    write: number
  }
}

interface ActionButtonsProps {
  onFork?: () => void
  onRevert?: () => void
  revertBusy?: boolean
  tokens?: TokenData
  cost?: number
  isUser?: boolean
  copyText?: string
}

export function ActionButtons({ onFork, onRevert, revertBusy, tokens, cost, isUser, copyText }: ActionButtonsProps) {
  const [copied, setCopied] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const hasTokens =
    tokens &&
    (tokens.input > 0 || tokens.output > 0 || tokens.reasoning > 0 || tokens.cache.read > 0 || tokens.cache.write > 0)

  const canCopy = typeof copyText === "string" && copyText.length > 0

  const writeClipboard = async (value: string) => {
    try {
      const promise = navigator.clipboard?.writeText(value)
      if (promise) {
        await promise
        return true
      }
    } catch {}

    if (!ideBridge.isInstalled()) return false

    try {
      const res = await Promise.race([
        ideBridge.request("clipboardWrite", { text: value }) as Promise<{ ok?: boolean }>,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ])
      if (!res) return false
      return !!res.ok
    } catch {
      return false
    }
  }

  useEffect(() => {
    const anyOther = canCopy || !!(isUser && onFork) || !!(isUser && onRevert)
    const delay = anyOther ? 500 : 3000

    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => {
      clearTimeout(timer)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [canCopy, isUser, onFork, onRevert])

  const handleCopy = () => {
    if (!canCopy) return

    void (async () => {
      const ok = await writeClipboard(copyText)
      if (!ok) {
        console.error("Failed to copy message")
        return
      }

      setCopied(true)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 1500)
    })()
  }

  if (!isVisible) return null

  return (
    <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-50">
      <div className="sticky top-1 h-0 w-full overflow-visible">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex gap-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-px pointer-events-auto">
          {canCopy && (
            <IconButton
              onClick={handleCopy}
              size="sm"
              className="p-0.5"
              aria-label={copied ? t("已复制到剪贴板") : t("复制到剪贴板")}
              title={copied ? t("已复制！") : t("复制到剪贴板")}
              data-tip={copied ? t("已复制！") : t("复制到剪贴板")}
              icon={
                copied ? (
                  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )
              }
            />
          )}

          {isUser && onFork && (
            <IconButton
              onClick={onFork}
              size="sm"
              className="p-0.5"
              aria-label={t("从这条消息创建会话分支")}
              title={t("从这条消息创建会话分支")}
              data-tip={t("从这条消息创建会话分支")}
              icon={
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 4v4a4 4 0 004 4h2a4 4 0 014 4v4M7 4h4M7 4H3M17 20h4M17 20l-3-3"
                  />
                </svg>
              }
            />
          )}
          {isUser && onRevert && (
            <IconButton
              onClick={onRevert}
              size="sm"
              className="p-0.5 hover:text-red-600 dark:hover:text-red-400"
              disabled={revertBusy}
              aria-label={t("从此消息回退")}
              title={t("从此消息回退")}
              data-tip={t("从此消息回退")}
              icon={
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H5v4m0-4l4 4m2-4h3a5 5 0 010 10H9"
                  />
                </svg>
              }
            />
          )}
          {hasTokens && tokens && typeof cost === "number" && <MessageStats tokens={tokens} cost={cost} />}
        </div>
      </div>
    </div>
  )
}
