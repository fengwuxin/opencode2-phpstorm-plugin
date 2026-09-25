import React from "react"
import type { ComponentPropsWithoutRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components, ExtraProps } from "react-markdown"
import { CodeBlock } from "./CodeBlock"
import { ideBridge } from "../lib/ideBridge"

interface MarkdownRendererProps {
  children: string
}

// Colors follow the official "opencode" theme (dark: lavender headings, orange bold,
// green inline code, peach links) so rendered messages match the CLI.
const styles = {
  text: "text-[#1a1a1a] dark:text-[#eeeeee]",
  textMuted: "text-[#1a1a1a] dark:text-[#eeeeee]",
  textDim: "text-[#8a8a8a] dark:text-[#808080]",
  border: "border-gray-300 dark:border-gray-700",
  bg: "bg-gray-50 dark:bg-gray-800/50",
  bgAlt: "bg-gray-100 dark:bg-gray-800",
  heading: "text-[#d68c27] dark:text-[#9d7cd8]",
  strong: "text-[#d68c27] dark:text-[#f5a742]",
  emph: "text-[#b0851f] dark:text-[#e5c07b]",
  link: "text-[#3b7dd8] dark:text-[#fab283]",
  listItem: "marker:text-[#3b7dd8] dark:marker:text-[#fab283]",
  listEnumeration: "marker:text-[#318795] dark:marker:text-[#56b6c2]",
  rule: "border-[#8a8a8a] dark:border-[#808080]",
}

// Custom components for styled markdown elements
const blockTags = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "canvas",
  "dd",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "noscript",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tfoot",
  "ul",
])

function hasBlockChild(children: React.ReactNode): boolean {
  const arr = React.Children.toArray(children)
  for (const child of arr) {
    if (!React.isValidElement(child)) continue
    const childType = child.type
    if (childType === CodeBlock && !(child.props as { inline?: boolean }).inline) return true
    if (typeof childType === "string" && blockTags.has(childType)) return true
    if (childType === React.Fragment) {
      const fragmentChildren = (child.props as { children?: React.ReactNode }).children
      if (hasBlockChild(fragmentChildren)) return true
    }
  }
  return false
}

interface RemarkNode {
  tagName?: string
  children?: unknown
}

function remarkNodeHasBlock(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const node = value as RemarkNode
  const tagName = typeof node.tagName === "string" ? node.tagName : undefined
  if (tagName && blockTags.has(tagName)) return true
  const childList = Array.isArray(node.children) ? node.children : []
  for (const child of childList) {
    if (remarkNodeHasBlock(child)) return true
  }
  return false
}

function remarkNodeHasBlockChild(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const node = value as RemarkNode
  const childList = Array.isArray(node.children) ? node.children : []
  for (const child of childList) {
    if (remarkNodeHasBlock(child)) return true
  }
  return false
}

type MarkdownCodeProps = ComponentPropsWithoutRef<"code"> &
  ExtraProps & {
    inline?: boolean
  }

const markdownComponents: Partial<Components> = {
  // Headings with proper hierarchy
  h1: ({ children }) => <h1 className={`text-2xl font-bold mb-2 mt-3 ${styles.heading}`}>{children}</h1>,
  h2: ({ children }) => <h2 className={`text-xl font-bold mb-1.5 mt-2.5 ${styles.heading}`}>{children}</h2>,
  h3: ({ children }) => <h3 className={`text-lg font-bold mb-1.5 mt-2 ${styles.heading}`}>{children}</h3>,
  h4: ({ children }) => <h4 className={`text-base font-bold mb-1 mt-1.5 ${styles.heading}`}>{children}</h4>,
  h5: ({ children }) => <h5 className={`text-sm font-bold mb-1 mt-1.5 ${styles.heading}`}>{children}</h5>,
  h6: ({ children }) => <h6 className={`text-xs font-bold mb-1 mt-1.5 ${styles.heading}`}>{children}</h6>,

  // Lists with proper indentation (markers use the CLI list colors)
  ul: ({ children }) => (
    <ul className={`list-disc list-inside mb-1.5 space-y-0.5 ${styles.text} ${styles.listItem}`}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className={`list-decimal list-inside mb-1.5 space-y-0.5 ${styles.text} ${styles.listEnumeration}`}>{children}</ol>
  ),
  li: ({ children }) => <li className={`ml-4 ${styles.text}`}>{children}</li>,

  // Blockquotes with left border
  blockquote: ({ children }) => (
    <blockquote className={`border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-3 ${styles.bg} py-2 italic ${styles.emph}`}>
      {children}
    </blockquote>
  ),

  // Code blocks and inline code with syntax highlighting
  code: (props: MarkdownCodeProps) => {
    const { inline, className, children, node } = props
    // hack for inline code, `text` in MD is not marked as inline
    const isInline = inline ?? node?.position?.start.line === node?.position?.end.line

    // Extract language from className (format: language-xxx)
    const match = /language-([\w-]+)/.exec(className || "")
    const language = match ? match[1] : ""

    // Convert children to string
    const value = String(children).replace(/\n$/, "")

    return <CodeBlock language={language} value={value} inline={isInline} />
  },

  // Paragraphs
  p: (props) => {
    const nodeHasBlock = remarkNodeHasBlockChild(props.node)
    if (nodeHasBlock) {
      return <div className={`mb-1.5 ${styles.text} leading-relaxed`}>{props.children}</div>
    }
    const childHasBlock = hasBlockChild(props.children)
    if (childHasBlock) {
      return <div className={`mb-1.5 ${styles.text} leading-relaxed`}>{props.children}</div>
    }
    return <p className={`mb-1.5 ${styles.text} leading-relaxed`}>{props.children}</p>
  },

  // Links that open in new tab (via IDE bridge when in JCEF to avoid hangs)
  a: ({ href, children }) => {
    const handleClick = (e: React.MouseEvent) => {
      if (href && ideBridge.isInstalled()) {
        e.preventDefault()
        ideBridge.send({ type: "openUrl", payload: { url: href } })
      }
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.link} hover:underline`}
        onClick={handleClick}
      >
        {children}
      </a>
    )
  },

  // Tables with borders and striped rows
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className={`min-w-full border ${styles.border} rounded-lg`}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className={styles.bgAlt}>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className={`border-b ${styles.border} hover:${styles.bg}`}>{children}</tr>,
  th: ({ children }) => (
    <th className={`px-4 py-2 text-left font-bold ${styles.text} border-r ${styles.border} last:border-r-0`}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className={`px-4 py-2 ${styles.text} border-r ${styles.border} last:border-r-0`}>{children}</td>
  ),

  // Horizontal rule
  hr: () => <hr className={`my-4 border-t ${styles.rule}`} />,

  // Strong (bold)
  strong: ({ children }) => <strong className={`font-bold ${styles.strong}`}>{children}</strong>,

  // Emphasis (italic)
  em: ({ children }) => <em className={`italic ${styles.emph}`}>{children}</em>,

  // Delete (strikethrough) - from GFM
  del: ({ children }) => <del className={`line-through ${styles.textDim}`}>{children}</del>,
}

export function MarkdownRenderer({ children }: MarkdownRendererProps) {
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
