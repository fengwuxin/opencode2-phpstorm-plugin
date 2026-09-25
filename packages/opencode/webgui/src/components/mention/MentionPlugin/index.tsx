import { useEffect, useState } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from "lexical"
import { MentionPopover } from "../MentionPopover"
import { createPortal } from "react-dom"
import { useIdeBridgeState } from "../../../state/IdeBridgeContext"
import { setEditorPopupOpen } from "../../../lib/editorPopup"
import { useMentionDetector } from "./MentionDetector"
import { useMentionHandler } from "./MentionHandler"

export function MentionPlugin() {
  const [editor] = useLexicalComposerContext()
  const [showPopover, setShowPopover] = useState(false)
  const [query, setQuery] = useState("")
  const [position, setPosition] = useState<{ top: number; left: number; placement: "top" | "bottom" }>({
    top: 0,
    left: 0,
    placement: "top",
  })
  const [mentionStartOffset, setMentionStartOffset] = useState<number | null>(null)
  const { openedFiles } = useIdeBridgeState()

  const { handleTextChange, handlePositionUpdate, resetState } = useMentionDetector(
    editor,
    setQuery,
    setShowPopover,
    setMentionStartOffset,
    setPosition,
  )

  const { insertMention } = useMentionHandler(editor, mentionStartOffset, openedFiles, resetState)

  // Listen for text changes
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        handleTextChange()
      })
    })
  }, [editor, handleTextChange])

  useEffect(() => {
    if (!showPopover) return

    const frame = requestAnimationFrame(() => {
      handlePositionUpdate()
    })

    return () => cancelAnimationFrame(frame)
  }, [showPopover, query, handlePositionUpdate])

  // Let the send-on-Enter handler defer while this popover is open.
  useEffect(() => {
    setEditorPopupOpen("mention", showPopover)
    return () => setEditorPopupOpen("mention", false)
  }, [showPopover])

  // Prevent default keyboard commands when popover is open
  useEffect(() => {
    if (!showPopover) return
    const removeArrowDownCommand = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      () => {
        return true // Prevent default
      },
      COMMAND_PRIORITY_LOW,
    )

    const removeArrowUpCommand = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      () => {
        return true // Prevent default
      },
      COMMAND_PRIORITY_LOW,
    )

    const removeEnterCommand = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        return true // Prevent default
      },
      COMMAND_PRIORITY_LOW,
    )

    const removeTabCommand = editor.registerCommand(
      KEY_TAB_COMMAND,
      () => {
        return true // Prevent default
      },
      COMMAND_PRIORITY_LOW,
    )

    const removeEscapeCommand = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        resetState()
        return true
      },
      COMMAND_PRIORITY_LOW,
    )

    return () => {
      removeArrowDownCommand()
      removeArrowUpCommand()
      removeEnterCommand()
      removeTabCommand()
      removeEscapeCommand()
    }
  }, [editor, showPopover, resetState])

  return showPopover
    ? createPortal(
        <MentionPopover query={query} position={position} onSelect={insertMention} onClose={resetState} onReposition={handlePositionUpdate} />,
        document.body,
      )
    : null
}
