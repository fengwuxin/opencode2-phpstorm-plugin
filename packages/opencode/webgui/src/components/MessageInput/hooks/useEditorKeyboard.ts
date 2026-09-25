import { useEffect } from "react"
import { KEY_ENTER_COMMAND, INSERT_LINE_BREAK_COMMAND, COMMAND_PRIORITY_HIGH, type LexicalEditor } from "lexical"
import { insertPlainWithMentionsImpl } from "../utils"
import { isEditorPopupOpen } from "../../../lib/editorPopup"

interface UseEditorKeyboardOptions {
  editor: LexicalEditor
  contentEditableRef: React.RefObject<HTMLDivElement | null>
  parseWithRange: (val: string) => { display: string; path: string; range?: { start: number; end: number } }
  onSubmit: () => void
}

export function useEditorKeyboard({ editor, contentEditableRef, parseWithRange, onSubmit }: UseEditorKeyboardOptions) {
  // Enter sends the message; Cmd/Ctrl+Enter (or Shift+Enter) inserts a new line.
  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (isEditorPopupOpen()) return false
        if (event?.isComposing) return false
        if (event?.metaKey || event?.ctrlKey || event?.shiftKey) {
          event.preventDefault()
          editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false)
          return true
        }
        event?.preventDefault()
        onSubmit()
        return true
      },
      COMMAND_PRIORITY_HIGH,
    )
  }, [editor, onSubmit])

  // Handle paste with mentions parsing
  useEffect(() => {
    const el = contentEditableRef.current
    if (!el) return

    const onPasteText = (e: Event) => {
      const ev = e as CustomEvent<{ text?: string }>
      const text = ev.detail?.text
      if (!text) return
      e.preventDefault()
      e.stopPropagation()
      insertPlainWithMentionsImpl(editor, parseWithRange, text)
    }

    const onPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return
      const plain = e.clipboardData.getData("text/plain")
      if (!plain) return
      e.preventDefault()
      e.stopPropagation()
      insertPlainWithMentionsImpl(editor, parseWithRange, plain)
    }

    el.addEventListener("opencode:paste-text", onPasteText as any, true)
    el.addEventListener("paste", onPaste as any, true)
    return () => {
      el.removeEventListener("opencode:paste-text", onPasteText as any, true)
      el.removeEventListener("paste", onPaste as any, true)
    }
  }, [contentEditableRef.current, editor, parseWithRange])
}
