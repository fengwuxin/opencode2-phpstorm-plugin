import { t } from "../../lib/i18n"
import { useState } from "react"
import { formatK, formatKM, formatCost } from "./utils"

interface UsageData {
  contextUsed: number
  contextLimit: number
  tokens: number
  cost: number
  percentage: number
  breakdown: {
    input: number
    cacheWrite: number
    cacheRead: number
    output: number
    reasoning: number
  }
}

interface UsageDisplayProps {
  usage: UsageData
}

export function UsageDisplay({ usage }: UsageDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)

  const pct = Math.min(100, Math.max(0, usage.percentage))
  const color = pct <= 40 ? "bg-green-500" : pct <= 60 ? "bg-yellow-500" : pct <= 75 ? "bg-orange-500" : "bg-red-500"

  return (
    <div className="relative flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 select-none min-w-0">
      <button
        onClick={() => setShowDetails((v) => !v)}
        className="flex items-center gap-1.5 group whitespace-nowrap overflow-hidden"
        title={t("查看用量详情")}
        data-tip={t("查看用量详情")}
      >
        <div className="w-[80px] h-2.5 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden relative">
          <div className={`${color} h-3`} style={{ width: `${pct}%` }} />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-900 dark:text-white drop-shadow-sm">
            {Math.round(pct)}%
          </span>
        </div>
        <span className="tabular-nums">
          {formatK(usage.contextUsed)}/{formatK(usage.contextLimit)}
        </span>
        <span className="tabular-nums">{formatKM(usage.tokens)}</span>
        <span className="tabular-nums">{formatCost(usage.cost)}</span>
      </button>

      {showDetails && (
        <div className="absolute top-full left-0 mt-1 w-64 z-50 overflow-hidden rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-900 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto py-1">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-gray-700 dark:text-gray-300">{t("已用上下文")}</span>
              <span className="tabular-nums">
                {formatK(usage.contextUsed)}/{formatK(usage.contextLimit)}
              </span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-gray-700 dark:text-gray-300">{t("输入 token")}</span>
              <span className="tabular-nums">{formatK(usage.breakdown.input)}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-gray-700 dark:text-gray-300">{t("缓存写入")}</span>
              <span className="tabular-nums">{formatK(usage.breakdown.cacheWrite)}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-gray-700 dark:text-gray-300">{t("缓存读取")}</span>
              <span className="tabular-nums">{formatK(usage.breakdown.cacheRead)}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-gray-700 dark:text-gray-300">{t("输出 token")}</span>
              <span className="tabular-nums">{formatK(usage.breakdown.output)}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-gray-700 dark:text-gray-300">{t("思考 token")}</span>
              <span className="tabular-nums">{formatK(usage.breakdown.reasoning)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
