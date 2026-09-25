import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { MentionPlugin } from "../mention/MentionPlugin"
import { AttachmentPlugin } from "../attachment/AttachmentPlugin"
import { CommandPlugin } from "../command/CommandPlugin"
import type { EditorState } from "lexical"

interface EditorContentProps {
  contentEditableRef: React.RefObject<HTMLDivElement | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  onEditorChange: (editorState: EditorState) => void
  placeholder: string
}

export function EditorContent({ contentEditableRef, containerRef, onEditorChange, placeholder }: EditorContentProps) {
  return (
    <div className="px-2 pt-1.5 pb-1">
      <div ref={containerRef} className="relative modern-input bg-white dark:bg-gray-900">
        <RichTextPlugin
          contentEditable={
            // @ts-expect-error React 19 type compatibility
            <ContentEditable
              ref={contentEditableRef}
              className="px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none min-h-[52px] max-h-[400px] overflow-y-auto"
              style={{ caretColor: "auto" }}
              aria-placeholder={placeholder}
              placeholder={
                <div className="absolute top-1.5 left-2 text-sm text-gray-400 dark:text-gray-500 pointer-events-none">
                  {placeholder}
                </div>
              }
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <OnChangePlugin onChange={onEditorChange} />
        <HistoryPlugin />
        <MentionPlugin />
        <CommandPlugin />
        <AttachmentPlugin />
      </div>
    </div>
  )
}
