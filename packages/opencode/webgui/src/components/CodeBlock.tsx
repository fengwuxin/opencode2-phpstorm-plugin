import { t } from "../lib/i18n"
import { useState, useEffect, useRef } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useTheme } from "../state/ThemeContext"
import { cn } from "../utils/classNames"

interface CodeBlockProps {
  language: string
  value: string
  inline?: boolean
}

export function CodeBlock({ language, value, inline = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const { theme } = useTheme()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Keep this inline-only branch before style computation so future edits do not regress the inline layout
  if (inline) {
    return (
      <code className="text-[#3d9a57] dark:text-[#7fd88f] px-1 py-0.5 rounded text-sm font-mono">
        {value}
      </code>
    )
  }

  const baseStyle = theme === "light" ? vs : vscDarkPlus
  const { background: bg, backgroundColor: bgc, ...styleRest } = baseStyle
  const syntaxStyle = {
    ...styleRest,
    backgroundColor: bgc ?? bg ?? "transparent",
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy code:", err)
    }
  }

  return (
    <div className="relative my-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-700">
      {/* Header with language badge and copy button */}
      <div className="flex items-center justify-between bg-gray-200 dark:bg-gray-900 px-3 py-1.5 border-b border-gray-300 dark:border-gray-700">
        {/* Clickable area for collapse/expand (left) */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
        >
          {/* Language badge */}
          {language && <span className="text-xs text-gray-600 dark:text-gray-400 font-mono uppercase">{language}</span>}
        </button>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors px-2 py-1 rounded hover:bg-gray-300/70 dark:hover:bg-gray-700/50"
          title={copied ? t("已复制！") : t("复制代码")}
          data-tip={copied ? t("已复制！") : t("复制代码")}
        >
          {copied ? (
            <>
              {/* Check icon */}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{t("已复制！")}</span>
            </>
          ) : (
            <>
              {/* Copy icon */}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>{t("复制")}</span>
            </>
          )}
        </button>

        {/* Chevron toggle button (right) */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded hover:bg-gray-300/70 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 ml-2"
          aria-label={isExpanded ? t("折叠代码") : t("展开代码")}
        >
          <svg
            viewBox="0 0 24 24"
            className={cn("w-3 h-3 transition-transform duration-150", isExpanded && "rotate-90")}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Code with syntax highlighting */}
      {isExpanded && (
        <div className="overflow-x-auto">
          <SyntaxHighlighter
            language={language || "text"}
            style={syntaxStyle}
            customStyle={{
              margin: 0,
              padding: "0.75rem",
              fontSize: "0.875rem",
              lineHeight: "1.5",
            }}
            codeTagProps={{
              style: {
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              },
            }}
          >
            {value}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  )
}
