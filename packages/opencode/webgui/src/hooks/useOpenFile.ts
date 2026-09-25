import { useCallback } from "react"
import { ideBridge } from "../lib/ideBridge"
import { useProject } from "../state/ProjectContext"
import { useToast } from "../state/ToastContext"

interface RangeEndpoint {
  line?: number
}

interface RangeLike {
  start?: RangeEndpoint
  end?: RangeEndpoint
}

export interface OpenFileTarget {
  path?: string | null
  display?: string
  range?: RangeLike
  line?: number
}

const RANGE_SUFFIX_REGEX = /:(\d+)(?:-(\d+))?$/

const hasDriveLetter = (value: string): boolean => /^[A-Za-z]:[\\/]/.test(value)

const decodeFileUrlPath = (value: string): string | null => {
  try {
    const url = new URL(value)
    if (url.protocol !== "file:") return null
    const hostPrefix = url.host ? `//${url.host}` : ""
    const pathname = decodeURIComponent(url.pathname || "") || "/"
    if (/^\/[A-Za-z]:/.test(pathname)) return `${hostPrefix}${pathname.slice(1)}`
    return `${hostPrefix}${pathname}`
  } catch {
    return null
  }
}

const normalizeRelative = (value: string): string => value.replace(/^([\\/])+/, "")

const stripRangeSuffix = (value?: string | null): string | null => {
  if (!value) return null
  return value.replace(RANGE_SUFFIX_REGEX, "")
}

const extractSuffixFromDisplay = (value?: string | null): string | null => {
  if (!value) return null
  const match = value.match(RANGE_SUFFIX_REGEX)
  return match ? match[0] : null
}

const toZeroBased = (line: number): number => Math.max(0, Math.floor(line))

const suffixFromRange = (range?: RangeLike): string | null => {
  const startLine = range?.start?.line
  if (typeof startLine !== "number" || Number.isNaN(startLine)) return null
  const normalizedStart = toZeroBased(startLine) + 1
  const endLine = range?.end?.line
  if (typeof endLine === "number" && !Number.isNaN(endLine)) {
    const normalizedEnd = toZeroBased(endLine) + 1
    if (normalizedEnd > normalizedStart) {
      return `:${normalizedStart}-${normalizedEnd}`
    }
  }
  return `:${normalizedStart}`
}

const appendRangeSuffix = (absolutePath: string, target: OpenFileTarget): string => {
  if (RANGE_SUFFIX_REGEX.test(absolutePath)) return absolutePath
  const displaySuffix = extractSuffixFromDisplay(target.display)
  if (displaySuffix) return `${absolutePath}${displaySuffix}`
  const rangeSuffix = suffixFromRange(target.range)
  if (rangeSuffix) return `${absolutePath}${rangeSuffix}`
  return absolutePath
}

const parseLineFromDisplay = (value?: string): number | undefined => {
  if (!value) return undefined
  const idx = value.lastIndexOf(":")
  if (idx === -1) return undefined
  const tail = value.slice(idx + 1)
  const match = tail.match(/^(\d+)(?:-\d+)?$/)
  if (!match) return undefined
  const parsed = parseInt(match[1], 10)
  if (Number.isNaN(parsed)) return undefined
  return Math.max(0, parsed - 1)
}

const pickLine = (target: OpenFileTarget): number | undefined => {
  if (typeof target.line === "number" && Number.isFinite(target.line)) return target.line
  const rangeLine = target.range?.start?.line
  if (typeof rangeLine === "number" && Number.isFinite(rangeLine)) return rangeLine
  return parseLineFromDisplay(target.display)
}

export function useOpenFile() {
  const { worktree } = useProject()
  const { showToast } = useToast()

  const resolveAbsolutePath = useCallback(
    (target: OpenFileTarget): string | null => {
      const candidate = target.path ?? stripRangeSuffix(target.display) ?? target.display ?? null
      if (!candidate) return null
      const trimmed = candidate.trim()
      if (!trimmed) return null
      if (trimmed.startsWith("file://")) {
        const decoded = decodeFileUrlPath(trimmed)
        if (decoded) return decoded
      }
      if (trimmed.startsWith("/") || hasDriveLetter(trimmed)) return trimmed
      if (!worktree) return trimmed
      const base = worktree.replace(/[\\/]+$/, "")
      const suffix = normalizeRelative(trimmed)
      if (!suffix) return base
      return `${base}/${suffix}`
    },
    [worktree],
  )

  return useCallback(
    async (target: OpenFileTarget) => {
      const absolutePath = resolveAbsolutePath(target)
      if (!absolutePath) {
        showToast("无法打开文件：路径不可用", {
          title: "IDE Bridge",
          variant: "error",
        })
        return
      }
      const line = pickLine(target)
      const pathWithRange = appendRangeSuffix(absolutePath, target)
      const payload = line !== undefined ? { path: pathWithRange, line } : { path: pathWithRange }
      try {
        await ideBridge.request("openFile", payload)
      } catch (error) {
        console.error("[useOpenFile] Failed to open file", error)
        showToast("在 IDE 中打开文件失败", {
          title: "IDE Bridge",
          variant: "error",
        })
      }
    },
    [resolveAbsolutePath, showToast],
  )
}
