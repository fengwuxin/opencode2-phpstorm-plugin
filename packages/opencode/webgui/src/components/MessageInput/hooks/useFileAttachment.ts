import { t } from "../../../lib/i18n"
import { useCallback, useRef } from "react"
import { $getSelection, $isRangeSelection, type LexicalEditor } from "lexical"
import { $createAttachmentNode } from "../../attachment/AttachmentNode"
import {
  fileToDataURL,
  getExtensionFromFilename,
  getMimeTypeFromExtension,
  isSupportedAttachmentType,
  normalizeTextAttachment,
} from "../../../lib/fileUtils"
import { useToast } from "../../../state/ToastContext"

export function useFileAttachment(editor: LexicalEditor) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { showToast } = useToast()

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return

      for (const file of Array.from(files)) {
        const ext = getExtensionFromFilename(file.name)
        const mime = file.type || getMimeTypeFromExtension(ext)

        if (!isSupportedAttachmentType(mime)) {
          showToast(`File type not supported: ${file.name}`, {
            title: t("不支持的文件类型"),
            variant: "error",
            duration: 5000,
          })
          continue
        }

        try {
          const dataUrl = await fileToDataURL(file)
          const normalized = normalizeTextAttachment(mime, dataUrl)

          const metadata = {
            id: crypto.randomUUID(),
            display: file.name,
            filename: file.name,
            mime: normalized.mime,
            url: normalized.url,
            size: file.size,
          }

          editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              const attachmentNode = $createAttachmentNode(metadata)
              selection.insertNodes([attachmentNode])
            }
          })
        } catch {
          showToast(`Failed to read file: ${file.name}`, {
            title: t("文件读取失败"),
            variant: "error",
            duration: 5000,
          })
        }
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [editor, showToast],
  )

  return {
    fileInputRef,
    handleFileSelect,
    handleFileChange,
  }
}
