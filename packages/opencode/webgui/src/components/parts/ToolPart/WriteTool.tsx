import { t } from "../../../lib/i18n"
import { CodeBlock } from "../../CodeBlock"
import { getLanguageFromFilename } from "./utils"

interface WriteToolProps {
  content: string
  filePath: string
}

export function WriteTool({ content, filePath }: WriteToolProps) {
  return (
    <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800">
      <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1">{t("内容")}</div>
      <div className="text-xs bg-white dark:bg-gray-900 rounded p-1.5 overflow-x-auto max-h-60 overflow-y-auto">
        <CodeBlock language={getLanguageFromFilename(filePath)} value={content} />
      </div>
    </div>
  )
}
