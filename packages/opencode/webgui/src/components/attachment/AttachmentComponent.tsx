import { type NodeKey } from "lexical"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { type AttachmentMetadata } from "./AttachmentNode"

interface AttachmentComponentProps {
  nodeKey: NodeKey
  metadata: AttachmentMetadata
}

export function AttachmentComponent({ nodeKey, metadata }: AttachmentComponentProps) {
  const [editor] = useLexicalComposerContext()

  const handleRemove = () => {
    editor.update(() => {
      const node = editor.getElementByKey(nodeKey)
      if (node) {
        const lexicalNode = editor.getEditorState()._nodeMap.get(nodeKey)
        if (lexicalNode) {
          lexicalNode.remove()
        }
      }
    })
  }

  const getIcon = () => {
    if (metadata.mime.startsWith("image/")) {
      return (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      )
    }
    if (metadata.mime === "application/pdf") {
      return (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      )
    }
    return (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    )
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      contentEditable={false}
      data-lexical-attachment="true"
    >
      {getIcon()}
      <span>{metadata.display}</span>
      <span className="text-[10px] opacity-70">{formatSize(metadata.size)}</span>
      <button
        onClick={handleRemove}
        className="ml-0.5 hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded p-0.5"
        title="移除附件"
        data-tip="移除附件"
      >
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  )
}
