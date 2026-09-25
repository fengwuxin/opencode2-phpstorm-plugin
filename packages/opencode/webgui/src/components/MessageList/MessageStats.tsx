import { useState, useRef, useEffect, useLayoutEffect } from "react"
import { formatK, formatCost } from "../../utils/formatting"
import { cn } from "../../utils/classNames"

interface TokenData {
  input: number
  output: number
  reasoning: number
  cache: {
    read: number
    write: number
  }
}

interface MessageStatsProps {
  tokens: TokenData
  cost: number
}

export function MessageStats({ tokens, cost }: MessageStatsProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [position, setPosition] = useState<"above" | "below">("below")
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    if (!showDetails || !buttonRef.current) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const spaceAbove = buttonRect.top
    const popoverHeight = 220

    if (spaceAbove < popoverHeight) {
      setPosition("below")
    } else {
      setPosition("above")
    }
  }, [showDetails])

  useEffect(() => {
    if (!showDetails) return

    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDetails(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showDetails])

  const total = tokens.input + tokens.output + tokens.reasoning + tokens.cache.read + tokens.cache.write

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowDetails((v) => !v)}
        className="modern-icon-button w-6 h-6 p-0.5 flex items-center justify-center"
        aria-label="查看 token 用量"
        title="查看 token 用量"
        data-tip="查看 token 用量"
      >
        <div className="w-3 h-3">
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
      </button>

      {showDetails && (
        <div
          ref={popoverRef}
          className={cn(
            "modern-card absolute left-1/2 -translate-x-1/2 w-48 z-50 overflow-hidden ring-1 ring-black/5 p-2 text-xs",
            position === "above" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between py-0.5 font-medium border-b border-gray-200 dark:border-gray-700 pb-1 mb-1">
              <span>总计</span>
              <span className="tabular-nums">{formatK(total)}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-gray-600 dark:text-gray-400">输入</span>
              <span className="tabular-nums">{formatK(tokens.input)}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-gray-600 dark:text-gray-400">缓存读取</span>
              <span className="tabular-nums">{formatK(tokens.cache.read)}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-gray-600 dark:text-gray-400">缓存写入</span>
              <span className="tabular-nums">{formatK(tokens.cache.write)}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-gray-600 dark:text-gray-400">输出</span>
              <span className="tabular-nums">{formatK(tokens.output)}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-gray-600 dark:text-gray-400">思考</span>
              <span className="tabular-nums">{formatK(tokens.reasoning)}</span>
            </div>
            <div className="flex items-center justify-between py-0.5 border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
              <span className="text-gray-600 dark:text-gray-400">费用</span>
              <span className="tabular-nums">{formatCost(cost)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
