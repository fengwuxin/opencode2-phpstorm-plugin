import { useEffect } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
  PASTE_COMMAND,
  type LexicalEditor,
} from "lexical"
import { $createAttachmentNode, type AttachmentMetadata } from "./AttachmentNode"
import { ideBridge } from "../../lib/ideBridge"

export function AttachmentPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const removePaste = editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData
        if (!clipboardData) return false

        // Check for image files in clipboard
        const items = Array.from(clipboardData.items)
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault()

            const file = item.getAsFile()
            if (!file) continue

            // Read the file and create attachment
            const reader = new FileReader()
            reader.onload = () => {
              const dataUrl = reader.result as string
              const index = countAttachments(editor) + 1

              insertAttachment(editor, {
                display: `Image #${index}`,
                filename: `image-${index}.${getExtensionFromMime(item.type)}`,
                mime: item.type,
                url: dataUrl,
                size: file.size,
              })
            }
            reader.readAsDataURL(file)

            return true
          }
        }

        return false
      },
      COMMAND_PRIORITY_HIGH,
    )

    // Embedded browsers (JetBrains JCEF) do not always expose clipboard images to the page,
    // so inside the IDE the paste chord is answered from the IDE clipboard instead.
    const removeKeyDown = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (!ideBridge.isInstalled()) return false
        if (!(event.metaKey || event.ctrlKey) || event.altKey) return false
        if (event.code !== "KeyV") return false

        event.preventDefault()
        void pasteFromIdeClipboard(editor)
        return true
      },
      COMMAND_PRIORITY_CRITICAL,
    )

    return () => {
      removePaste()
      removeKeyDown()
    }
  }, [editor])

  return null
}

/**
 * Asks the IDE for the clipboard content: images become attachments, text goes through the
 * plain-text paste path so that @mentions keep working.
 */
async function pasteFromIdeClipboard(editor: LexicalEditor) {
  const res = await ideBridge.request("clipboardRead")
  const clip = res?.payload
  if (!clip) return

  if (clip.kind === "image" && typeof clip.dataUrl === "string") {
    const mime = typeof clip.mime === "string" ? clip.mime : "image/png"
    const index = countAttachments(editor) + 1

    insertAttachment(editor, {
      display: `Image #${index}`,
      filename: `image-${index}.${getExtensionFromMime(mime)}`,
      mime,
      url: clip.dataUrl,
      size: typeof clip.size === "number" ? clip.size : 0,
    })
    return
  }

  if (clip.kind === "text" && typeof clip.text === "string" && clip.text.length > 0) {
    editor.getRootElement()?.dispatchEvent(
      new CustomEvent("opencode:paste-text", {
        detail: { text: clip.text },
        bubbles: true,
        cancelable: true,
      }),
    )
  }
}

function insertAttachment(editor: LexicalEditor, metadata: Omit<AttachmentMetadata, "id">) {
  editor.update(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return
    selection.insertNodes([$createAttachmentNode({ id: crypto.randomUUID(), ...metadata })])
  })
}

function countAttachments(editor: LexicalEditor): number {
  let count = 0
  editor.getEditorState().read(() => {
    const nodeMap = editor.getEditorState()._nodeMap
    for (const [, node] of nodeMap) {
      if (node.__type === "attachment") {
        count++
      }
    }
  })
  return count
}

function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
  }
  return map[mime] || "png"
}
