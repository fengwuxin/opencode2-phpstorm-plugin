import { useCallback } from "react"
import type { LexicalEditor } from "lexical"
import { $getSelection, $isRangeSelection, $isTextNode, TextNode } from "lexical"
import { $createMentionNode, type MentionMetadata } from "../MentionNode"

export function useMentionHandler(
  editor: LexicalEditor,
  mentionStartOffset: number | null,
  openedFiles: string[],
  resetState: () => void,
) {
  const insertMention = useCallback(
    (metadata: MentionMetadata) => {
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return
        }

        const anchor = selection.anchor
        const node = anchor.getNode()
        if (!$isTextNode(node)) {
          return
        }

        const offset = anchor.offset

        // Find and delete the mention text (from @ to cursor)
        if (mentionStartOffset !== null) {
          const textContent = node.getTextContent()
          const before = textContent.slice(0, mentionStartOffset)
          const after = textContent.slice(offset)

          // Replace text node content
          const newText = before + after
          const textNode = node as TextNode
          textNode.setTextContent(newText)

          if (metadata.display === "所有打开的文件") {
            const nodes: Array<TextNode | ReturnType<typeof $createMentionNode>> = []
            for (const p of openedFiles) {
              if (!p) continue
              const md: MentionMetadata = { type: p.endsWith("/") ? "directory" : "file", display: p, path: p }
              nodes.push($createMentionNode(md))
              nodes.push(new TextNode(" "))
            }
            if (nodes.length > 0) {
              if (mentionStartOffset > 0) {
                const [beforeNode] = textNode.splitText(mentionStartOffset)
                for (const n of nodes) beforeNode.insertAfter(n)
              } else {
                // insert in reverse order before to keep original order after insertion
                for (let i = nodes.length - 1; i >= 0; i--) textNode.insertBefore(nodes[i])
              }
              // place cursor after the last inserted node
              const last = nodes[nodes.length - 1]
              if (last instanceof TextNode) last.select()
            }
          } else {
            // Create and insert single mention node
            const mentionNode = $createMentionNode(metadata)
            if (mentionStartOffset > 0) {
              const [beforeNode] = textNode.splitText(mentionStartOffset)
              beforeNode.insertAfter(mentionNode)
            } else {
              textNode.insertBefore(mentionNode)
            }
            const spaceNode = new TextNode(" ")
            mentionNode.insertAfter(spaceNode)
            spaceNode.select()
          }
        }

        resetState()
      })
    },
    [editor, mentionStartOffset, openedFiles, resetState],
  )

  return { insertMention }
}
